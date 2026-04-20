import { z } from "zod";

export const createRatingSchema = z.object({
  participantId: z.string().uuid("Invalid participant ID"),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  review: z
    .string()
    .max(500, "Review cannot exceed 500 characters")
    .optional()
});

export const updateRatingSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5")
    .optional(),
  review: z
    .string()
    .max(500, "Review cannot exceed 500 characters")
    .optional()
}).refine(
  (data) => data.rating !== undefined || data.review !== undefined,
  "At least one of rating or review must be provided"
);
