export interface PasswordResetTemplateParams {
  resetUrl: string;
  userName?: string;
  expiresMinutes?: number;
}

export function generatePasswordResetEmail(params: PasswordResetTemplateParams): {
  subject: string;
  text: string;
  html: string;
} {
  const expires = params.expiresMinutes || 60;
  const greeting = params.userName ? `Hello ${params.userName},` : "Hello,";
  const subject = "Reset Your Brightloop SMS Password";

  const text = `${greeting}

We received a request to reset the password associated with your Brightloop SMS account.

Click the link below to set a new password:
${params.resetUrl}

This link will expire in ${expires} minutes and can only be used once.

If you did not request this password reset, you can safely ignore this email.

Regards,
The Brightloop SMS Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #172033; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5EAF1; border-radius: 12px; padding: 36px; box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05);">
          <!-- Header / Branding -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #E5EAF1;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 34px; height: 34px; line-height: 34px; text-align: center; background-color: #315CF5; color: #ffffff; border-radius: 8px; font-weight: 700; font-size: 16px; margin-right: 10px; vertical-align: middle;">✦</span>
                    <span style="font-size: 18px; font-weight: 600; color: #172033; vertical-align: middle; letter-spacing: -0.02em;">Brightloop SMS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top: 24px; padding-bottom: 24px;">
              <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600; color: #172033;">${greeting}</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748B;">
                We received a request to reset the password for your Brightloop SMS account. Click the button below to establish a new password.
              </p>

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #315CF5;">
                    <a href="${params.resetUrl}" target="_blank" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 28px; display: inline-block; border-radius: 8px; background-color: #315CF5;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Note -->
              <div style="background-color: #F8FAFC; border: 1px solid #E5EAF1; padding: 12px 16px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #64748B;">
                  ⏱ This secure reset link expires in <strong>${expires} minutes</strong> and can only be used once.
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                If the button above does not work, copy and paste this URL into your browser:<br>
                <a href="${params.resetUrl}" style="color: #315CF5; word-break: break-all;">${params.resetUrl}</a>
              </p>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8;">
                If you did not request this password reset, please disregard this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #E5EAF1; font-size: 12px; color: #94A3B8;">
              <p style="margin: 0 0 4px 0; font-weight: 500; color: #64748B;">Brightloop Subscription Management System</p>
              <p style="margin: 0;">Automated Security Notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
