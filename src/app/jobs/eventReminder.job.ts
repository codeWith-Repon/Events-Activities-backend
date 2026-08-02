import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import { JoinStatus, NotificationType } from "../../generated/prisma/client";
import { notify } from "../modules/notification/notification.service";
import { buildEventReminderEmail } from "../utils/emailTemplates";
import { resolveEventStart } from "../utils/eventStart";

const sendEventReminders = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneDayMs = 24 * 60 * 60 * 1000;

  const candidates = await prisma.eventParticipant.findMany({
    where: {
      reminderSent: false,
      joinStatus: JoinStatus.APPROVED,
      // `date` is midnight UTC, so it can't express "within 24h" on its own.
      // Scan a day either side and narrow by the real start time below.
      event: {
        date: {
          gte: new Date(now.getTime() - oneDayMs),
          lte: new Date(now.getTime() + 2 * oneDayMs)
        }
      }
    },
    select: {
      id: true,
      userId: true,
      event: { select: { title: true, date: true, time: true, location: true } }
    }
  });

  const participants = candidates.filter(({ event }) => {
    const start = resolveEventStart(event.date, event.time);
    return start !== null && start > now && start <= in24h;
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
