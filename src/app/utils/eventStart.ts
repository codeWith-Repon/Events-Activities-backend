import { envVars } from "../config/env";

/**
 * `Event.date` is stored at midnight UTC and `Event.time` is a bare "HH:mm"
 * wall-clock string that the UI prints verbatim — neither column on its own is
 * the moment the event begins. Anything that cares about time of day has to
 * recombine them, shifting the wall clock by the offset it was written in.
 *
 * Returns null when `time` can't be parsed so callers skip the row rather than
 * quietly treating midnight as the start.
 */
export const resolveEventStart = (date: Date, time: string): Date | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? "").trim());
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;

    const midnightUtc = new Date(date);
    midnightUtc.setUTCHours(0, 0, 0, 0);

    const wallClockMinutes = hours * 60 + minutes;
    return new Date(
        midnightUtc.getTime() +
        (wallClockMinutes - envVars.EVENT_TIME_OFFSET_MINUTES) * 60 * 1000
    );
};
