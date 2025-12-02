import { z } from "zod";

export const eventParticipantSchema = z.object({
    eventId: z.string().nonempty("Event ID is required")
});
