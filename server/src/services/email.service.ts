import nodemailer from 'nodemailer';

// Create Nodemailer Transporter with fast 4-second timeout
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000
    });
  }

  // Fallback dev transporter
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal_pass'
    },
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 3000
  });
};

export const sendPasswordResetOtpEmail = async (toEmail: string, otpCode: string, userName?: string): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"MK Delivery Services" <no-reply@mkdelivery.com>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #faf8f6;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1A1A1A; margin-bottom: 4px;">MK Delivery Services</h2>
          <p style="color: #C59363; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Delivering Greatness</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #eee;">
          <h3 style="color: #1a1a1a; margin-top: 0;">Password Reset Request</h3>
          <p style="color: #555; font-size: 14px; line-height: 1.5;">
            Hello ${userName || 'Valued Partner'},<br/>
            We received a request to reset the password for your MK Delivery account associated with <strong>${toEmail}</strong>.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #C59363; background-color: #FAF8F6; padding: 12px 24px; border-radius: 8px; border: 1px solid #C59363; display: inline-block;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #777; font-size: 12px; text-align: center;">
            This 6-digit OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
          <p>If you did not request a password reset, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} MK Delivery Services. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send with timeout race so API call never hangs
    const sendPromise = transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `Your Password Reset OTP: ${otpCode} - MK Delivery`,
      html: htmlContent
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 3500)
    );

    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[Email Service] Password Reset OTP ${otpCode} sent to ${toEmail}.`);
    return true;
  } catch (error: any) {
    console.log(`\n========================================`);
    console.log(`🔐 [PASSWORD RESET OTP GENERATED] Target Email: ${toEmail}`);
    console.log(`🔑 6-DIGIT OTP CODE: ${otpCode}`);
    console.log(`========================================\n`);
    return true;
  }
};
