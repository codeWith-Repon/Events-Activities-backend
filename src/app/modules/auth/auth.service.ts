import { prisma } from "../../../lib/prisma";
import bcryptjs from "bcryptjs"
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { createNewAccessTokenWitRefreshToken, createUserToken } from "../../utils/userToken";
import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";


const loginUser = async (payload: { email: string; password: string }) => {

    const isUserExist = await prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email
        }
    })

    const isPasswordMatch = await bcryptjs.compare(payload.password, isUserExist.password)

    if (!isPasswordMatch) {
        throw new AppError(status.BAD_REQUEST, "Invalid credentials")
    }

    const token = createUserToken(isUserExist)

    return token
}

const getNewToken = async (refreshToken: string) => {
    const newToken = await createNewAccessTokenWitRefreshToken(refreshToken)
    return {
        accessToken: newToken.accessToken,
        refreshToken: newToken.refreshToken
    }
}

export const resetPassword = async (
    payload: Record<string, any>,
    decodedToken: JwtPayload
) => {
    const { newPassword } = payload;

    // 1. Validate request
    if (!newPassword) {
        throw new AppError(status.BAD_REQUEST, "New password is required");
    }

    // 2. Verify user from token
    const user = await prisma.user.findUnique({
        where: {
            id: decodedToken.userId,
        },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const isSameAsOld = await bcryptjs.compare(newPassword, user.password as string)

    if (isSameAsOld) {
        throw new AppError(status.BAD_REQUEST, "This password is already in use. Please choose a different password.");
    }

    // 3. Hash password
    const hashedPassword = await bcryptjs.hash(
        newPassword,
        Number(envVars.BCRYPT_SALT_ROUND)
    );

    // 4. Update password
    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hashedPassword,
        },
    });

    return {
        message: "Password reset successfully",
    };
};

const changePassword = async (payload: { oldPassword: string, newPassword: string }, decodedToken: JwtPayload) => {

    const user = await prisma.user.findUnique({
        where: {
            id: decodedToken.userId,
        },
    });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const isOldPasswordMatch = await bcryptjs.compare(payload.oldPassword, user.password as string)

    if (!isOldPasswordMatch) {
        throw new AppError(status.BAD_REQUEST, "Old Password does not match")
    }

    const isSameAsOld = await bcryptjs.compare(payload.newPassword, user.password as string)

    if (isSameAsOld) {
        throw new AppError(status.BAD_REQUEST, "New password cannot be same as old password.")
    }

    const hashedPassword = await bcryptjs.hash(payload.newPassword, Number(envVars.BCRYPT_SALT_ROUND))

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hashedPassword,
        },
    });

    return {
        message: "Password changed successfully",
    };
}

export const AuthService = {
    loginUser,
    getNewToken,
    resetPassword,
    changePassword
}
