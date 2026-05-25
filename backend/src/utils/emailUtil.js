import nodemailer from "nodemailer";
import { logger } from "#utils/logger.js";

let transporter = null;
let emailMode = "console";

const APP_NAME = "Newsroom MCP";

const getTransporter = async () => {
  if (transporter) return { transporter, mode: emailMode };

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    transporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: resendApiKey },
    });
    emailMode = "resend";
    logger.info("Email mode: Resend");
    return { transporter, mode: emailMode };
  }

  if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    emailMode = "smtp";
    logger.info("Email mode: SMTP", { host: smtpHost, port: smtpPort });
    return { transporter, mode: emailMode };
  }

  if (process.env.NODE_ENV === "production") {
    logger.warn("No email service configured in production");
    emailMode = "none";
    return { transporter: null, mode: emailMode };
  }

  // Development fallback — Ethereal preview mailbox
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  emailMode = "ethereal";
  logger.info("Email mode: Ethereal (dev preview)", { user: testAccount.user });
  return { transporter, mode: emailMode };
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const { transporter: transport, mode } = await getTransporter();
  const from = process.env.FROM_EMAIL || `noreply@newsroommcp.com`;

  if (mode === "none" || !transport) {
    logger.warn("Email not sent — no email service configured", { to, subject });
    return { skipped: true, to, subject };
  }

  const info = await transport.sendMail({ from, to, subject, html, text });

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

/* ── Templated emails (extend per feature) ── */

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
  await sendEmail({ to: email, subject, html });
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
  await sendEmail({ to: email, subject, html });
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
  await sendEmail({ to: email, subject, html });
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
  await sendEmail({ to: email, subject, html });
};
