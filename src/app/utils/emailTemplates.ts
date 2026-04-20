const baseTemplate = ({
  accentColor,
  icon,
  heading,
  body,
  cta
}: {
  accentColor: string;
  icon: string;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header bar -->
        <tr>
          <td style="background:${accentColor};padding:32px 40px;text-align:center">
            <div style="font-size:40px;line-height:1">${icon}</div>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">${heading}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            ${body}
            ${cta ? `
            <div style="text-align:center;margin-top:28px">
              <a href="${cta.href}"
                 style="display:inline-block;padding:14px 32px;background:${accentColor};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.2px">
                ${cta.label}
              </a>
            </div>` : ""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">
              &copy; ${new Date().getFullYear()} Events &amp; Activities Platform &nbsp;&bull;&nbsp; You received this because you have an account with us.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const p = (text: string) =>
  `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">${text}</p>`;

const eventBadge = (title: string) =>
  `<div style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:8px 16px;margin-bottom:20px;font-size:14px;color:#374151;font-weight:600">${title}</div>`;

export const buildApprovalEmail = (eventTitle: string) =>
  baseTemplate({
    accentColor: "#16a34a",
    icon: "🎉",
    heading: "You're confirmed!",
    body: `
      ${eventBadge(eventTitle)}
      ${p(`Your spot for <strong>${eventTitle}</strong> has been confirmed. Get ready for a great time!`)}
      ${p("Please arrive on time and bring everything you need for the event.")}
    `
  });

export const buildRejectionEmail = (eventTitle: string) =>
  baseTemplate({
    accentColor: "#dc2626",
    icon: "😔",
    heading: "Request not approved",
    body: `
      ${eventBadge(eventTitle)}
      ${p(`Unfortunately your request to join <strong>${eventTitle}</strong> was not approved by the host.`)}
      ${p("Don't be discouraged — there are plenty of other events waiting for you!")}
    `
  });

export const buildWaitlistedEmail = (eventTitle: string) =>
  baseTemplate({
    accentColor: "#d97706",
    icon: "⏳",
    heading: "You're on the waitlist",
    body: `
      ${eventBadge(eventTitle)}
      ${p(`<strong>${eventTitle}</strong> is currently full, but you've been added to the waitlist.`)}
      ${p("If a spot opens up you'll be automatically approved and notified right away. Hang tight!")}
    `
  });

export const buildWaitlistPromotedEmail = (eventTitle: string) =>
  baseTemplate({
    accentColor: "#7c3aed",
    icon: "🚀",
    heading: "A spot just opened for you!",
    body: `
      ${eventBadge(eventTitle)}
      ${p(`Great news — a spot has opened up and you've been <strong>automatically approved</strong> for <strong>${eventTitle}</strong>!`)}
      ${p("Your place is now confirmed. We can't wait to see you there.")}
    `
  });

export const buildEventCancelledEmail = (eventTitle: string) =>
  baseTemplate({
    accentColor: "#6b7280",
    icon: "🚫",
    heading: "Event cancelled",
    body: `
      ${eventBadge(eventTitle)}
      ${p(`We're sorry to let you know that <strong>${eventTitle}</strong> has been cancelled by the host.`)}
      ${p("We hope to see you at future events. Keep an eye out for new ones!")}
    `
  });

export const buildEventReminderEmail = (eventTitle: string, date: string, location: string) =>
  baseTemplate({
    accentColor: "#2563eb",
    icon: "📅",
    heading: "Your event is tomorrow!",
    body: `
      ${eventBadge(eventTitle)}
      ${p(`Just a friendly reminder that <strong>${eventTitle}</strong> is happening <strong>tomorrow</strong>.`)}
      <table cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin-bottom:16px;width:100%">
        <tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px">&#128197; DATE</td></tr>
        <tr><td style="font-size:15px;color:#111827;font-weight:600">${date}</td></tr>
        <tr><td style="font-size:13px;color:#6b7280;padding:12px 0 6px">&#128205; LOCATION</td></tr>
        <tr><td style="font-size:15px;color:#111827;font-weight:600">${location}</td></tr>
      </table>
      ${p("Don't be late — we look forward to seeing you there!")}
    `
  });

export const buildInvitationEmail = (params: {
  eventTitle: string;
  hostName: string;
  inviteLink: string;
  expiresAt: Date;
}): string =>
  baseTemplate({
    accentColor: "#4f46e5",
    icon: "✉️",
    heading: "You've been personally invited",
    body: `
      ${eventBadge(params.eventTitle)}
      ${p(`<strong>${params.hostName}</strong> has personally invited you to join <strong>${params.eventTitle}</strong>.`)}
      ${p("Click the button below to accept and secure your spot.")}
      <p style="margin:20px 0 0;text-align:center;color:#9ca3af;font-size:12px">
        This invitation expires on <strong>${params.expiresAt.toDateString()}</strong>. If you weren't expecting this, you can safely ignore it.
      </p>
    `,
    cta: { label: "Accept Invitation", href: params.inviteLink }
  });

export const buildPasswordResetEmail = (resetLink: string, expiryMinutes: number): string =>
  baseTemplate({
    accentColor: "#0f172a",
    icon: "🔐",
    heading: "Reset your password",
    body: `
      ${p("We received a request to reset your password. Click the button below to choose a new one.")}
      ${p(`This link will expire in <strong>${expiryMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this email.`)}
      <p style="margin:20px 0 0;text-align:center;color:#9ca3af;font-size:12px">
        For security, this link can only be used once.
      </p>
    `,
    cta: { label: "Reset Password", href: resetLink }
  });
