import nodemailer from "nodemailer";
import { logger } from "#utils/logger.js";
import { addEmailJob } from "#queues/emailQueue.js";
import { isRedisAvailable } from "#config/redisConfig.js";
import { getProviderConfig } from "#services/system/integrationService.js";

/**
 * ============================================================
 *  Email Utility
 * ============================================================
 *
 *  Two interfaces:
 *
 *    1. enqueueEmail({ to, subject, html, text, meta? })
 *       — Non-blocking. Pushes a job onto the BullMQ `email-delivery`
 *         queue and returns immediately. Used by all templated
 *         senders below (sendOtpEmail, sendInvitationEmail, …).
 *         If the queue is unavailable (Redis down / disabled), it
 *         falls back to a synchronous send so dev environments
 *         without Redis still work.
 *
 *    2. sendEmailNow({ to, subject, html, text })
 *       — Synchronous send. Used by the BullMQ worker
 *         (workers/emailWorker.js) and by the queue fallback path.
 *         Resolves the SMTP transporter from:
 *           - DB-managed admin integration (preferred)
 *           - .env (SMTP_HOST/RESEND_API_KEY)
 *           - Ethereal preview (dev only)
 *         Throws on hard failures so BullMQ retries the job with
 *         exponential backoff.
 */

const APP_NAME = "Newsroom MCP";

/* ──────────────────────────────────────────────────────────
 *  Transporter — built per-call so DB rotations take effect
 *  immediately. Singleton is risky here (admin rotates SMTP →
 *  cached transport keeps using old creds → users get nothing).
 * ────────────────────────────────────────────────────────── */

const buildTransport = async () => {
  /* 1. DB-managed SMTP */
  try {
    const dbCfg = await getProviderConfig("smtp");
    if (dbCfg?.host && dbCfg?.user && dbCfg?.pass) {
      const port = Number(dbCfg.port || 587);
      return {
        transporter: nodemailer.createTransport({
          host: dbCfg.host,
          port,
          secure: port === 465,
          auth: { user: dbCfg.user, pass: dbCfg.pass },
        }),
        from: dbCfg.from || process.env.FROM_EMAIL || "noreply@newsroommcp.com",
        mode: "smtp-db",
      };
    }
  } catch (err) {
    logger.warn("[email] DB SMTP lookup failed", { message: err.message });
  }

  /* 2. Resend API (env) */
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    return {
      transporter: nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: resendApiKey },
      }),
      from: process.env.FROM_EMAIL || "noreply@newsroommcp.com",
      mode: "resend",
    };
  }

  /* 3. SMTP from env */
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpHost && smtpUser && smtpPass) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      }),
      from: process.env.FROM_EMAIL || "noreply@newsroommcp.com",
      mode: "smtp-env",
    };
  }

  /* 4. Production with no transport — explicit failure so BullMQ retries
   *    (admins can wire SMTP later and the queue drains). */
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No email service is configured. Add SMTP credentials via Admin → Integrations."
    );
  }

  /* 5. Dev fallback — Ethereal preview mailbox */
  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    from: process.env.FROM_EMAIL || "noreply@newsroommcp.com",
    mode: "ethereal",
  };
};

/* ──────────────────────────────────────────────────────────
 *  Synchronous send — used by the worker AND the fallback path.
 *  Throws on failure so BullMQ retries.
 * ────────────────────────────────────────────────────────── */
export const sendEmailNow = async ({ to, subject, html, text }) => {
  const { transporter, from, mode } = await buildTransport();

  const info = await transporter.sendMail({ from, to, subject, html, text });

  if (mode === "ethereal") {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info("Email preview URL (Ethereal)", { previewUrl });
      console.log(`\n📧 Ethereal Preview: ${previewUrl}\n`);
    }
  }

  logger.info("Email sent", { to, subject, messageId: info.messageId, mode });
  return info;
};

/* ──────────────────────────────────────────────────────────
 *  Non-blocking enqueue — used by every templated sender.
 *
 *  Behavior:
 *    - If the queue accepts the job, returns { queued:true, jobId }
 *      immediately. The user request is unblocked.
 *    - If the queue is unreachable (Redis down / disabled), falls
 *      back to a direct send. Errors are LOGGED, not thrown — the
 *      user's primary action (register, invite, reset) must succeed
 *      even if email never makes it out.
 * ────────────────────────────────────────────────────────── */
const QUEUE_DISABLED = process.env.EMAIL_QUEUE_DISABLED === "true";

export const enqueueEmail = async ({ to, subject, html, text, meta = {} }) => {
  if (!to || !subject) {
    logger.warn("[email] enqueueEmail: missing to/subject", { to, subject });
    return { queued: false, error: "Missing recipient or subject" };
  }

  /* Skip the queue when explicitly disabled or Redis is unreachable.
   * Email is best-effort by design — direct fallback keeps register/
   * invite/reset flows working in dev without Redis. */
  const useQueue = !QUEUE_DISABLED && isRedisAvailable();

  if (useQueue) {
    try {
      const jobId = await addEmailJob({ to, subject, html, text, meta });
      logger.info("[email] queued", { to, subject, jobId, template: meta.template });
      return { queued: true, jobId };
    } catch (err) {
      logger.warn("[email] queue unavailable, falling back to direct send", {
        message: err.message,
      });
    }
  }

  /* Fallback — direct send. Failures must NOT throw to the caller. */
  try {
    await sendEmailNow({ to, subject, html, text });
    return { queued: false, fallback: true };
  } catch (err) {
    logger.error("[email] direct fallback failed", {
      to,
      subject,
      message: err.message,
    });
    return { queued: false, error: err.message };
  }
};

/* Backward-compat alias — old call sites used `sendEmail`. They get
 * the new non-blocking behavior automatically. */
export const sendEmail = enqueueEmail;

/* ──────────────────────────────────────────────────────────
 *  Templated emails (extend per feature)
 *  All call enqueueEmail so they're non-blocking.
 * ────────────────────────────────────────────────────────── */

export const sendOtpEmail = async (email, code) => {
  const subject = `${APP_NAME} — Your verification code`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">${APP_NAME} verification</h2>
        <p style="color: #4b5563;">Your one-time verification code:</p>
        <div style="background: #f0f4ff; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this code, please ignore this email.</p>
      </div>
    </div>`;
  return enqueueEmail({ to: email, subject, html, meta: { template: "otp" } });
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = `${APP_NAME} — Password reset`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Reset your password</h2>
        <p style="color: #4b5563;">Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
      </div>
    </div>`;
  return enqueueEmail({
    to: email,
    subject,
    html,
    meta: { template: "password-reset" },
  });
};

export const sendWelcomeEmail = async (email, firstName) => {
  const subject = `Welcome to ${APP_NAME}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Welcome, ${firstName}!</h2>
        <p style="color: #4b5563;">Your ${APP_NAME} workspace is ready. Start publishing smarter today.</p>
      </div>
    </div>`;
  return enqueueEmail({ to: email, subject, html, meta: { template: "welcome" } });
};

export const sendInvitationEmail = async (
  email,
  { inviteUrl, inviterName = "A teammate", roleName = "Team member" }
) => {
  const subject = `${APP_NAME} — You're invited to join a workspace`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px;">
        <h2 style="color: #1a1a2e; margin-top: 0;">You're invited!</h2>
        <p style="color: #4b5563;">
          <strong>${inviterName}</strong> invited you to their workspace on ${APP_NAME}
          as <strong>${roleName}</strong>.
        </p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 22px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600;">
            Accept invitation
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          This invitation expires in 7 days. If you didn't expect it, you can ignore this email.
        </p>
      </div>
    </div>`;
  return enqueueEmail({
    to: email,
    subject,
    html,
    meta: { template: "invitation" },
  });
};
