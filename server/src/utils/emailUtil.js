import nodemailer from "nodemailer";
import { logger } from "#utils/logger.js";

let transporter = null;
let emailMode = "console";

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
      auth: {
        user: "resend",
        pass: resendApiKey,
      },
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
    logger.warn("No email service configured in production. Set RESEND_API_KEY or SMTP_* env vars.");
    emailMode = "none";
    return { transporter: null, mode: emailMode };
  }

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
  const from = process.env.FROM_EMAIL || process.env.COMPANY_SYSTEM_EMAIL || "noreply@sharebit.com";

  if (mode === "none" || !transport) {
    logger.warn("Email not sent - no email service configured", { to, subject });
    return { skipped: true, to, subject };
  }

  if (mode === "console") {
    logger.info("Email (console)", { to, subject, html });
    return { console: true, to, subject };
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

export const sendOtpEmail = async (email, code) => {
  const subject = "ShareBit - Your OTP Verification Code";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">ShareBit Verification</h2>
        <p style="color: #4b5563;">Your one-time verification code is:</p>
        <div style="background: #f0f4ff; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this code, please ignore this email.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject, html });
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = "ShareBit - Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #4b5563;">You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject, html });
};

export const sendWelcomeEmail = async (email, firstName) => {
  const subject = "Welcome to ShareBit!";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Welcome to ShareBit, ${firstName}!</h2>
        <p style="color: #4b5563;">Your account has been created successfully. You can now start investing and tracking your portfolio.</p>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, feel free to contact our support team.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject, html });
};

export const sendWithdrawalStatusEmail = async (email, firstName, status, amount) => {
  const subject = `ShareBit - Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
        <p style="color: #4b5563;">Hi ${firstName},</p>
        <p style="color: #4b5563;">Your withdrawal request of <strong>$${amount}</strong> has been <strong>${status}</strong>.</p>
        ${status === "approved" ? '<p style="color: #6b7280; font-size: 14px;">The amount will be transferred to your account shortly.</p>' : ""}
        ${status === "rejected" ? '<p style="color: #6b7280; font-size: 14px;">Please contact support if you have any questions.</p>' : ""}
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject, html });
};

export const sendDepositStatusEmail = async (email, firstName, status, amount) => {
  const subject = `ShareBit - Deposit ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="color: #1a1a2e; margin-top: 0;">Deposit ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
        <p style="color: #4b5563;">Hi ${firstName},</p>
        <p style="color: #4b5563;">Your deposit request of <strong>$${amount}</strong> has been <strong>${status}</strong>.</p>
        ${status === "approved" ? '<p style="color: #6b7280; font-size: 14px;">The amount has been added to your wallet balance.</p>' : ""}
      </div>
    </div>
  `;
  await sendEmail({ to: email, subject, html });
};
