import nodemailer from "nodemailer";
import { envVars } from "../config/env";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const { HOST, PORT, USER, PASS, FROM } = envVars.SMTP;

  if (!HOST || !USER || !PASS) {
    console.log(`[Email skipped — SMTP not configured] To: ${options.to} | Subject: ${options.subject}`);
    return;
  }

  const port = Number(PORT) || 587;

  const transporter = nodemailer.createTransport({
    host: HOST,
    port,
    secure: port === 465,
    auth: { user: USER, pass: PASS }
  });

  await transporter.sendMail({
    from: FROM || USER,
    to: options.to,
    subject: options.subject,
    html: options.html
  });
};
