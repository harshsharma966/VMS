const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../config/logger');

// Create transporter - use SMTP in production, ethereal/console in dev
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (config.email && config.email.host) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  } else {
    // Dev fallback: log to console instead of sending
    transporter = {
      sendMail: async (opts) => {
        logger.info('📧 [DEV EMAIL] Would send email:');
        logger.info(`  To: ${opts.to}`);
        logger.info(`  Subject: ${opts.subject}`);
        logger.info(`  Text: ${opts.text || ''}`);
        logger.info(`  HTML preview: ${(opts.html || '').substring(0, 200)}...`);
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }

  return transporter;
}

const emailService = {
  async sendPasswordResetEmail(email, name, resetToken) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: `"Smart-Cam" <${config.email?.from || 'noreply@smart-cam.local'}>`,
      to: email,
      subject: 'Reset Your Smart-Cam Password',
      text: `Hi ${name},\n\nYou requested a password reset for your Smart-Cam account.\n\nClick the link below to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nThe Smart-Cam Team`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#F7983A,#e07d1a);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 16px;margin-bottom:16px;">
              <span style="font-size:28px;">📹</span>
            </div>
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Smart-Cam</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Video Management System</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;">Reset Your Password</h2>
            <p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              You requested a password reset for your Smart-Cam account. Click the button below to create a new password.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#F7983A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                Reset Password
              </a>
            </div>
            <p style="margin:0 0 8px;color:#888;font-size:13px;">
              This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
            </p>
            <p style="margin:0;color:#bbb;font-size:12px;word-break:break-all;">
              Or copy this link: ${resetUrl}
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} Smart-Cam. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    };

    try {
      const info = await getTransporter().sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email} (${info.messageId})`);
      return true;
    } catch (err) {
      logger.error(`Failed to send password reset email to ${email}: ${err.message}`);
      throw err;
    }
  },

  async sendWelcomeEmail(email, name) {
    const mailOptions = {
      from: `"Smart-Cam" <${config.email?.from || 'noreply@smart-cam.local'}>`,
      to: email,
      subject: 'Welcome to Smart-Cam',
      text: `Hi ${name},\n\nWelcome to Smart-Cam! Your account has been created successfully.\n\nThe Smart-Cam Team`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="600" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#F7983A,#e07d1a);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">Welcome to Smart-Cam!</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#555;font-size:15px;">Hi <strong>${name}</strong>, your account is ready.</p>
          <p style="color:#555;font-size:15px;">Start monitoring your sites with Smart-Cam's powerful camera management tools.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    };

    try {
      await getTransporter().sendMail(mailOptions);
      return true;
    } catch (err) {
      logger.error(`Failed to send welcome email to ${email}: ${err.message}`);
      // Don't throw - welcome email failure shouldn't break registration
      return false;
    }
  },
};

module.exports = emailService;
