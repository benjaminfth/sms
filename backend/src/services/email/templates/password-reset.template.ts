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

Click the button below to create a new password.

${params.resetUrl}

This link will expire after ${expires} minutes and can only be used once.

If you did not request this password reset, you can safely ignore this email.

Regards,
Brightloop Software Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header / Branding -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; border-radius: 8px; font-weight: 700; font-size: 18px; margin-right: 10px; vertical-align: middle;">B</span>
                    <span style="font-size: 20px; font-weight: 700; color: #0f172a; vertical-align: middle;">Brightloop SMS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top: 28px; padding-bottom: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b;">${greeting}</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155;">
                We received a request to reset the password associated with your Brightloop SMS account.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #334155;">
                Click the button below to create a new password.
              </p>

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${params.resetUrl}" target="_blank" style="font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 8px; background-color: #2563eb;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Warning -->
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #475569;">
                  This link will expire after <strong>${expires} minutes</strong> and can only be used once.
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If the button above does not work, copy and paste this URL into your browser:<br>
                <a href="${params.resetUrl}" style="color: #2563eb; word-break: break-all;">${params.resetUrl}</a>
              </p>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">
                If you did not request this password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">Regards,</p>
              <p style="margin: 0;">Brightloop Software Team</p>
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
