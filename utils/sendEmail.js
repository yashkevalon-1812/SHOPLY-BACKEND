import nodemailer from 'nodemailer';

/**
 * Creates an email transporter using environment variables.
 * Supports Gmail or any standard SMTP server (Brevo, SendGrid, Mailtrap, etc.)
 * If no credentials are configured in .env, creates an automated test transport.
 */
let cachedTestAccount = null;

const createTransporter = async () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // 1. Real configured SMTP / Gmail credentials provided
  if (user && pass) {
    if (host.includes('gmail') || process.env.EMAIL_SERVICE === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: user,
          pass: pass,
        },
      });
    }

    return nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465,
      auth: {
        user: user,
        pass: pass,
      },
    });
  }

  // 2. Fallback: Automated Ethereal test account if credentials not yet set in .env
  console.log('\n⚠️  [SHOPLY EMAIL NOTICE] EMAIL_USER / EMAIL_PASS not yet set in .env');
  console.log('📬  Creating test mailer so email is still generated and viewable...');
  if (!cachedTestAccount) {
    cachedTestAccount = await nodemailer.createTestAccount();
  }

  return nodemailer.createTransport({
    host: cachedTestAccount.smtp.host,
    port: cachedTestAccount.smtp.port,
    secure: cachedTestAccount.smtp.secure,
    auth: {
      user: cachedTestAccount.user,
      pass: cachedTestAccount.pass,
    },
  });
};

/**
 * Sends a branded Shoply password reset OTP email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit numeric verification code
 * @param {string} options.name - Recipient user name (optional)
 */
export const sendOtpEmail = async ({ to, otp, name = 'Valued Customer' }) => {
  const transporter = await createTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"Shoply Security" <${process.env.EMAIL_USER || 'security@shoply.com'}>`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Shoply Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background-color: #f59e0b; width: 44px; height: 44px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 900; color: #000000; line-height: 44px; display: inline-block;">S</span>
                  </td>
                  <td style="padding-left: 12px; text-align: left;">
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">SHOPLY</div>
                    <div style="font-size: 10px; font-weight: 700; color: #f59e0b; letter-spacing: 2px; text-transform: uppercase;">Security Center</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                Password Reset Verification
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">${name}</strong>,<br>
                We received a request to reset your password for your Shoply marketplace account (<strong>${to}</strong>). Use the 6-digit verification code below to complete the reset.
              </p>

              <!-- OTP Highlight Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #1e293b; border: 2px dashed #f59e0b; border-radius: 16px; padding: 18px 36px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Your 6-Digit OTP</div>
                      <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', Courier, monospace;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice Badge -->
              <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 12px 16px; margin: 0 0 24px 0; font-size: 12px; color: #fbbf24; text-align: left;">
                ⏱️ <strong>Strict Security Window:</strong> This verification code is valid for <strong>10 minutes</strong>. Never share this code with anyone, including Shoply staff.
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not request a password reset, you can safely disregard this email. Your existing password will remain secure and unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
                This is an automated security notification from Shoply Inc.
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                © 2026 Shoply Inc. All rights reserved. • Mumbai & Worldwide
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textContent = `SHOPLY SECURITY - PASSWORD RESET
  
Hello ${name},

Your 6-digit verification code to reset your Shoply account password is:

${otp}

This code is valid for 10 minutes. Do not share this code with anyone.

If you did not request this password reset, please ignore this email.

© 2026 Shoply Inc.`;

  const mailOptions = {
    from: fromAddress,
    to: to,
    subject: `🔐 Shoply Password Reset Code: ${otp}`,
    text: textContent,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`✉️  [SHOPLY EMAIL] OTP successfully dispatched to ${to} (Message ID: ${info.messageId})`);
  if (previewUrl) {
    console.log(`🔗 [SHOPLY EMAIL TEST PREVIEW]: ${previewUrl}`);
  }
  return { success: true, messageId: info.messageId, previewUrl };
};
