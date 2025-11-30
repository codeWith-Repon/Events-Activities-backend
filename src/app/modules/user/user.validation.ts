import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateUserSchema = z.object({
    name: z.string().min(2).optional(),

    email: z.email().optional(),

    password: z.string().min(6).optional(),

    gender: z.enum(["MALE", "FEMALE"]).optional(),

    dob: z.string().datetime().optional(),

    address: z.string().min(3).optional(),

    contactNumber: z.string().min(10).optional(),

    bio: z.string().optional(),

    profileImage: z.url().optional(),

    role: z.enum(["SUPER_ADMIN", "ADMIN", "USER", "HOST"]).optional(),

    status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
});

export const userValidation = {
    createUserSchema,
    updateUserSchema,
};