import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import { JoinStatus, NotificationType } from "../../generated/prisma/client";
import { notify } from "../modules/notification/notification.service";
import { buildEventReminderEmail } from "../utils/emailTemplates";

const sendEventReminders = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const participants = await prisma.eventParticipant.findMany({
    where: {
      reminderSent: false,
      joinStatus: JoinStatus.APPROVED,
      event: {
        date: { gte: now, lte: in24h }
      }
    },
    select: {
      id: true,
      userId: true,
      event: { select: { title: true, date: true, location: true } }
    }
  });

  if (participants.length === 0) return;

  for (const participant of participants) {
    const { title, date, location } = participant.event;
    const dateStr = date.toDateString();

    notify({
      userId: participant.userId,
      type: NotificationType.EVENT_REMINDER,
      title: `Reminder: ${title} is tomorrow`,
      message: `Don't forget — "${title}" is happening on ${dateStr} at ${location}.`,
      emailHtml: buildEventReminderEmail(title, dateStr, location)
    });

    await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { reminderSent: true }
    });
  }

  console.log(`[Reminder] Sent to ${participants.length} participant(s)`);
};

// Runs every hour
export const startEventReminderJob = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Running event reminder job...");
    await sendEventReminders();
  });

  console.log("✅ Event reminder job scheduled (every hour)");
};
