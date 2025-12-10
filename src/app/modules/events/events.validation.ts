import { z } from "zod";

export const createEventSchema = z.object({

    title: z.string().min(3, "Title must be at least 3 characters"),
    category: z.string().min(2, "Category is required"),

    description: z.string().min(10, "Description must be at least 10 characters"),

    date: z.string().refine(
        (val) => !isNaN(Date.parse(val)),
        "Invalid date format"
    ),

    time: z.string("Time is required"),

    location: z.string().min(3, "Location is required"),

    minParticipants: z.string("Min participants is required"),
    maxParticipants: z.string("Max participants is required"),

    fee: z.string().optional(),

    image: z.array(z.url()).optional(),
});

export const updateEventSchema = z.object({
    title: z.string().min(3).optional(),
    category: z.string().min(2).optional(),
    description: z.string().min(10).optional(),

    date: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), "Invalid date")
        .optional(),

    time: z.string().optional(),

    location: z.string().optional(),

    minParticipants: z.number().min(1).optional(),
    maxParticipants: z.number().min(1).optional(),

    fee: z.number().min(0).optional(),

    images: z.array(z.url()).optional(),
    deleteImages: z.array(z.string()).optional(),

    status: z.enum(["OPEN", "FULL", "CANCELLED", "COMPLETED"]).optional(),
});
