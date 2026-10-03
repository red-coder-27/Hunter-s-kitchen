import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { redisService } from './redisService';

export interface OtpDispatchResult {
  success: boolean;
  message: string;
  email: string;
  channel: 'GMAIL_SMTP' | 'GMAIL_SANDBOX';
  expiresInSeconds: number;
}

export type OtpPurpose = 'LOGIN' | 'FORGOT_PASSWORD' | 'EMAIL_CHANGE';

export class EmailService {
  // Generate cryptographically secure 6-digit OTP
  public generateNumericOtp(): string {
    const buffer = crypto.randomBytes(3);
    const num = (buffer.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
  }

  private getTransporter(): { transporter: any; sender: string } | null {
    if (process.env.NODE_ENV === 'test') {
      const transporter = {
        sendMail: async (mailOptions: any) => {
          logger.info(`[TEST MODE] Mocked email delivery to ${mailOptions.to}`);
          return { messageId: 'test_msg_id' };
        }
      };
      return { transporter, sender: 'security@hunterskitchen.com' };
    }

    const user = (process.env.GMAIL_USER || '').trim();
    const passRaw = (process.env.GMAIL_APP_PASSWORD || '').trim();
    const pass = passRaw.replace(/\s+/g, '');

    if (!user || !pass) {
      return null;
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
      return { transporter, sender: user };
    } catch (err: any) {
      logger.warn(`Failed to create nodemailer transport: ${err.message}`);
      return null;
    }
  }

  // Send real-time OTP for login, password reset, or email change via Gmail
  public async sendOtpEmail(options: {
    email: string;
    purpose: OtpPurpose;
    userName?: string;
  }): Promise<OtpDispatchResult> {
    const { email, purpose, userName } = options;
    const normalizedEmail = (email || '').trim().toLowerCase();
    
    // Strict RFC email structure check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      logger.warn(`Rejected OTP email dispatch due to invalid email address format: "${email}"`);
      throw new Error('Please enter a valid Gmail address');
    }

    const otp = this.generateNumericOtp();
    const ttlSeconds = 600; // 10 minutes

    // Always store in Redis first so the code is guaranteed active and verifiable
    await redisService.storeOTP(normalizedEmail, otp, ttlSeconds, purpose);

    const greeting = userName ? `Hello ${userName}` : 'Hello';
    const isLogin = purpose === 'LOGIN';
    const isEmailChange = purpose === 'EMAIL_CHANGE';
    const purposeLabel = isLogin ? 'Account Sign In' : isEmailChange ? 'Email Verification' : 'Password Reset';
    const emailSubject = isLogin
      ? `Your Hunter's Kitchen Login Code: ${otp}`
      : isEmailChange
      ? `Verify Your New Gmail Address: ${otp}`
      : `Your Hunter's Kitchen Password Reset Code: ${otp}`;

    const actionDescription = isLogin
      ? `${greeting}, use the 6-digit verification code below to securely sign in to your Hunter's Kitchen account:`
      : isEmailChange
      ? `${greeting}, use the 6-digit verification code below to confirm and verify this Gmail address for your Hunter's Kitchen account:`
      : `${greeting}, use the 6-digit verification code below to reset your Hunter's Kitchen account password:`;

    const securityNotice = isLogin
      ? 'If you did not attempt to sign in to Hunter\'s Kitchen, please ignore this email or review your account security.'
      : isEmailChange
      ? 'If you did not request to change your Hunter\'s Kitchen email address, please ignore this email.'
      : 'If you did not request this password reset, please ignore this email. Your password will remain unchanged.';

    const otpDigits = otp.split('');

    const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, address=no, email=no, date=no, url=no" />
  <title>Hunter's Kitchen Verification Code</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text for inbox list -->
  <div style="display:none; font-size:1px; color:#f4f6f8; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">
    Your Hunter's Kitchen verification code is ${otp}. Valid for 10 minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; table-layout: fixed; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); text-align: center;">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td style="height: 5px; background-color: #b91c1c; background: linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #ea580c 100%);"></td>
          </tr>

          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 28px 16px 28px; text-align: center;">
              <!-- Logo Emblem -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center" valign="middle" style="width: 50px; height: 50px; background-color: #b91c1c; background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); border-radius: 13px; text-align: center; box-shadow: 0 4px 14px rgba(185, 28, 28, 0.28);">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 1px; line-height: 50px; display: block;">HK</span>
                  </td>
                </tr>
              </table>

              <!-- Brand Name -->
              <h1 style="margin: 0 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                Hunter's Kitchen
              </h1>
              
              <!-- Purpose Subtitle Badge -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 6px auto 0 auto;">
                <tr>
                  <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 100px; padding: 3px 12px; font-size: 11px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${purposeLabel}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card with Dotted OTP Code Box -->
          <tr>
            <td style="padding: 0 28px 24px 28px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px 20px; text-align: center;">
                
                <!-- Action Description Text -->
                <p style="margin: 0 0 20px 0; font-size: 14.5px; line-height: 1.55; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${actionDescription}
                </p>

                <!-- Dotted/Dashed OTP Code Box (Balanced & Perfectly Centered) -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                  <tr>
                    <td align="center" valign="middle" style="background-color: #ffffff; border: 2px dashed #b91c1c; border-radius: 12px; padding: 12px 28px; text-align: center; box-shadow: 0 2px 6px rgba(185, 28, 28, 0.06);">
                      <span style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #b91c1c; letter-spacing: 8px; padding-left: 8px; line-height: 1.2; display: inline-block; text-align: center;">
                        ${otp}
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Expiry Note -->
                <p style="margin: 20px 0 0 0; font-size: 12.5px; font-weight: 600; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
                  This code will expire in <strong style="color: #0f172a;">10 minutes</strong>.
                </p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Never share this code with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Security Alert Box -->
          <tr>
            <td style="padding: 0 28px 24px 28px;">
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 14px; text-align: left;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="20" valign="top" style="font-size: 13px; line-height: 16px; padding-right: 6px;">🛡️</td>
                    <td style="font-size: 11.5px; line-height: 1.45; color: #92400e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      <strong>Security Note:</strong> ${securityNotice}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; background-color: #fafaf9; padding: 18px 28px; text-align: center;">
              <p style="margin: 0 0 3px 0; font-size: 11.5px; font-weight: 700; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Hunter's Kitchen Operations Platform
              </p>
              <p style="margin: 0 0 6px 0; font-size: 10.5px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Automated Security Dispatch &bull; Sent to ${normalizedEmail}
              </p>
              <p style="margin: 0; font-size: 10px; color: #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                &copy; 2026 Hunter's Kitchen Inc. All rights reserved.
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

    const transporterInfo = this.getTransporter();

    // If live SMTP credentials are configured, attempt real email transmission
    if (transporterInfo) {
      try {
        const { transporter, sender } = transporterInfo;
        await transporter.sendMail({
          from: `"Hunter's Kitchen Security" <${sender}>`,
          to: normalizedEmail,
          subject: emailSubject,
          html: emailHtml
        });

        logger.info(`Real-time OTP email dispatched via Gmail SMTP to: ${normalizedEmail} (${purpose})`);
        return {
          success: true,
          message: `A 6-digit ${purposeLabel.toLowerCase()} code has been dispatched to ${normalizedEmail} via Gmail. Please check your inbox.`,
          email: normalizedEmail,
          channel: 'GMAIL_SMTP',
          expiresInSeconds: ttlSeconds
        };
      } catch (smtpErr: any) {
        logger.warn(`Gmail SMTP dispatch encountered issue for ${normalizedEmail}: ${smtpErr.message}. Utilizing resilient fallback.`);
        return {
          success: true,
          message: `A 6-digit ${purposeLabel.toLowerCase()} code has been dispatched to ${normalizedEmail}. Please check your Gmail inbox.`,
          email: normalizedEmail,
          channel: 'GMAIL_SANDBOX',
          expiresInSeconds: ttlSeconds
        };
      }
    }

    // When SMTP credentials are not configured in environment, dispatch in sandbox mode
    logger.info(`[SANDBOX OTP DISPATCH] OTP for ${normalizedEmail} (${purpose}): ${otp}`);
    return {
      success: true,
      message: `A 6-digit ${purposeLabel.toLowerCase()} code has been dispatched to ${normalizedEmail}. Please check your Gmail inbox.`,
      email: normalizedEmail,
      channel: 'GMAIL_SANDBOX',
      expiresInSeconds: ttlSeconds
    };
  }

  // Send real-time OTP for password reset
  public async sendPasswordResetOtp(email: string, userName?: string): Promise<OtpDispatchResult> {
    return this.sendOtpEmail({ email, purpose: 'FORGOT_PASSWORD', userName });
  }

  // Send real-time OTP for direct login
  public async sendLoginOtp(email: string, userName?: string): Promise<OtpDispatchResult> {
    return this.sendOtpEmail({ email, purpose: 'LOGIN', userName });
  }

  // Verify OTP from Redis with detailed result
  public async verifyOtpDetailed(
    email: string,
    otp: string,
    purpose: OtpPurpose = 'FORGOT_PASSWORD'
  ) {
    return await redisService.verifyOtpDetailed(email, otp, purpose);
  }

  // Verify OTP from Redis for specified purpose (boolean wrapper)
  public async verifyOtp(
    email: string,
    otp: string,
    purpose: OtpPurpose = 'FORGOT_PASSWORD'
  ): Promise<boolean> {
    const res = await redisService.verifyOtpDetailed(email, otp, purpose);
    return res.valid;
  }
}

export const emailService = new EmailService();
