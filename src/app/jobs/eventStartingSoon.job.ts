import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import { EventStatus, JoinStatus, NotificationType } from "../../generated/prisma/client";
import { notify } from "../modules/notification/notification.service";
import { buildEventStartingSoonEmail } from "../utils/emailTemplates";
import { resolveEventStart } from "../utils/eventStart";

/** How far ahead of the real start time attendees get the nudge. */
const LEAD_MINUTES = 60;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Deterministic per user, per event — this is what makes the job idempotent
 * without a dedicated column on EventParticipant.
 */
export const startingSoonTitle = (eventTitle: string) => `Starting soon: ${eventTitle}`;

export const sendStartingSoonAlerts = async (now: Date = new Date()) => {
    const cutoff = new Date(now.getTime() + LEAD_MINUTES * 60 * 1000);

    // `date` is midnight UTC, so no date range can express "starts within the
    // hour" on its own. Narrow to the surrounding days here — one day either
    // side covers every timezone offset — and filter on the real start below.
    const candidates = await prisma.eventParticipant.findMany({
        where: {
            joinStatus: JoinStatus.APPROVED,
            event: {
                status: { notIn: [EventStatus.CANCELLED, EventStatus.COMPLETED] },
                date: {
                    gte: new Date(now.getTime() - DAY_MS),
                    lte: new Date(now.getTime() + DAY_MS)
                }
            }
        },
        select: {
            userId: true,
            event: { select: { title: true, date: true, time: true, location: true } }
        }
    });

    const due = candidates.filter(({ event }) => {
        const start = resolveEventStart(event.date, event.time);
        // Skip events already under way: a late nudge is worse than none.
        return start !== null && start > now && start <= cutoff;
    });

    if (due.length === 0) return 0;

    // One lookup for the whole batch. Matching on the notification we would
    // create means a restart, an overlapping run, or a missed tick can never
    // double-send, and a job that was down still catches up on its next run.
    const alreadyNotified = await prisma.notification.findMany({
        where: {
            userId: { in: [...new Set(due.map((d) => d.userId))] },
            type: NotificationType.EVENT_REMINDER,
            title: { in: [...new Set(due.map((d) => startingSoonTitle(d.event.title)))] },
            createdAt: { gte: new Date(now.getTime() - DAY_MS) }
        },
        select: { userId: true, title: true }
    });
    const sent = new Set(alreadyNotified.map((n) => `${n.userId}|${n.title}`));

    let delivered = 0;

    for (const { userId, event } of due) {
        const title = startingSoonTitle(event.title);
        const key = `${userId}|${title}`;
        if (sent.has(key)) continue;
        // Guard the batch itself — a user can only hold one row per event, but
        // this keeps the set honest if that ever changes.
        sent.add(key);

        await notify({
            userId,
            type: NotificationType.EVENT_REMINDER,
            title,
            message: `"${event.title}" starts at ${event.time} at ${event.location}. Time to head over.`,
            emailHtml: buildEventStartingSoonEmail(event.title, event.time, event.location)
        });

        delivered += 1;
    }

    if (delivered > 0) {
        console.log(`[StartingSoon] Notified ${delivered} attendee(s)`);
    }

    return delivered;
};

// Every 5 minutes: the lead time is only as precise as the tick.
export const startEventStartingSoonJob = () => {
    cron.schedule("*/5 * * * *", async () => {
        try {
            await sendStartingSoonAlerts();
        } catch (err) {
            // A throw here would reach the unhandledRejection handler and kill
            // the server; a missed tick is recovered by the next one.
            console.error("[StartingSoon] Job failed", err);
        }
    });

    console.log(`✅ Event starting-soon job scheduled (every 5 min, ${LEAD_MINUTES} min lead)`);
};
