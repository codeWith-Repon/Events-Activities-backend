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

export const buildInvitationEmail = (params: {
  eventTitle: string;
  hostName: string;
  inviteLink: string;
  expiresAt: Date;
}): string => `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#1a1a1a">You're invited to <em>${params.eventTitle}</em></h2>
    <p style="color:#444">
      <strong>${params.hostName}</strong> has personally invited you to join their event.
    </p>
    <a href="${params.inviteLink}"
       style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
      Accept Invitation
    </a>
    <p style="color:#888;font-size:13px">
      This invitation expires on <strong>${params.expiresAt.toDateString()}</strong>.
      If you did not expect this email, you can safely ignore it.
    </p>
  </div>
`;
