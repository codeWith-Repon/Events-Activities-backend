import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import { JoinStatus, NotificationType } from "../../generated/prisma/client";
import { notify } from "../modules/notification/notification.service";
import { buildEventReminderEmail } from "../utils/emailTemplates";

const sendEventReminders = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingEvents = await prisma.event.findMany({
    where: {
      reminderSent: false,
      date: { gte: now, lte: in24h }
    }
  });

  for (const event of upcomingEvents) {
    const participants = await prisma.eventParticipant.findMany({
      where: { eventId: event.id, joinStatus: JoinStatus.APPROVED },
      select: { userId: true }
    });

    const dateStr = event.date.toDateString();

    participants.forEach(({ userId }) => {
      notify({
        userId,
        type: NotificationType.EVENT_REMINDER,
        title: `Reminder: ${event.title} is tomorrow`,
        message: `Don't forget — "${event.title}" is happening on ${dateStr} at ${event.location}.`,
        emailHtml: buildEventReminderEmail(event.title, dateStr, event.location)
      });
    });

    await prisma.event.update({
      where: { id: event.id },
      data: { reminderSent: true }
    });

    console.log(`[Reminder] Sent for "${event.title}" to ${participants.length} participant(s)`);
  }
};

// Runs every hour
export const startEventReminderJob = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Running event reminder job...");
    await sendEventReminders();
  });

  console.log("✅ Event reminder job scheduled (every hour)");
};
