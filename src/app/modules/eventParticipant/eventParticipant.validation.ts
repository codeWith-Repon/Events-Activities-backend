import { z } from "zod";

export const eventParticipantSchema = z.object({
    eventId: z.string().nonempty("Event ID is required")
});

export const updateParticipantSchema = z.object({
    joinStatus: z.enum(["REJECTED", "CANCELLED"])
});
