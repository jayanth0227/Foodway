import dotenv from "dotenv";
import path from "path";
import nodemailer from "nodemailer";

// Load environment variables before creating SMTP transporter
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const smtpPort = Number(process.env.SMTP_PORT || 587);

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const verifySMTP = async (): Promise<void> => {
  try {
    await transporter.verify();
    console.log("📧 SMTP connection successful");
  } catch (error) {
    console.error("❌ SMTP connection failed:", error);
  }
};
