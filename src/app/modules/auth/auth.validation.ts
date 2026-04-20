import { z } from "zod";

export const loginSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(1, "Password is required")
});

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters")
});

export const resetPasswordSchema = z.object({
    newPassword: z.string().min(6, "New password must be at least 6 characters")
});

export const forgotPasswordSchema = z.object({
    email: z.email("Invalid email address")
});

export const resetPasswordWithTokenSchema = z.object({
    token: z.string().min(1, "Token is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters")
});
