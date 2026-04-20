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

const baseTemplate = (title: string, body: string) => `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
    <h2 style="color:#1a1a1a;margin-top:0">${title}</h2>
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
    <p style="color:#9ca3af;font-size:12px;margin:0">Events &amp; Activities Platform</p>
  </div>
`;

export const buildApprovalEmail = (eventTitle: string) =>
  baseTemplate(
    "You're in! 🎉",
    `<p style="color:#444">Your spot for <strong>${eventTitle}</strong> has been confirmed. We look forward to seeing you there!</p>`
  );

export const buildRejectionEmail = (eventTitle: string) =>
  baseTemplate(
    "Request not approved",
    `<p style="color:#444">Unfortunately your request to join <strong>${eventTitle}</strong> was not approved by the host.</p>`
  );

export const buildWaitlistedEmail = (eventTitle: string) =>
  baseTemplate(
    "You're on the waitlist",
    `<p style="color:#444">The event <strong>${eventTitle}</strong> is currently full. You've been added to the waitlist and will be automatically approved if a spot opens up.</p>`
  );

export const buildWaitlistPromotedEmail = (eventTitle: string) =>
  baseTemplate(
    "Great news — a spot opened up! 🎉",
    `<p style="color:#444">You've been moved from the waitlist and are now approved for <strong>${eventTitle}</strong>. See you there!</p>`
  );

export const buildEventCancelledEmail = (eventTitle: string) =>
  baseTemplate(
    "Event cancelled",
    `<p style="color:#444">We're sorry to inform you that <strong>${eventTitle}</strong> has been cancelled by the host.</p>`
  );

export const buildEventReminderEmail = (eventTitle: string, date: string, location: string) =>
  baseTemplate(
    `Reminder: ${eventTitle} is tomorrow`,
    `<p style="color:#444">Don't forget — <strong>${eventTitle}</strong> is happening tomorrow.</p>
     <p style="color:#444"><strong>Date:</strong> ${date}<br/><strong>Location:</strong> ${location}</p>`
  );

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
