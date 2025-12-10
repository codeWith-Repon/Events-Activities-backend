import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.email("Invalid email address").optional(),
    role: z.enum(["USER", "ADMIN", "SUPER_ADMIN", "HOST"]).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    dob: z.coerce.date().optional(),
    address: z.string().min(3, "Address must be at least 3 characters").optional(),
    contactNumber: z.string().min(10).optional(),
    bio: z.string().optional(),
    profileImage: z.url().optional(),
});

export const userValidation = {
    createUserSchema,
    updateUserSchema,
};