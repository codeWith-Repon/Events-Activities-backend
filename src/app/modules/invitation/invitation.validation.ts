import { z } from "zod";

export const sendInvitationSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  email: z.string().email("Invalid email address")
});
