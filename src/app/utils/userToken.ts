import { JwtPayload } from "jsonwebtoken";
import { Status, User } from "../../generated/prisma/client";
import { envVars } from "../config/env";
import { generateToken, verifyToken } from "./jwt";
import { prisma } from "../../lib/prisma";
import AppError from "../errorHelpers/AppError";
import status from "http-status";


export const createUserToken = (user: Partial<User>) => {
    const jwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
    }
    const accessToken = generateToken(jwtPayload, envVars.JWT_ACCESS_SECRET, envVars.JWT_ACCESS_EXPIRES);

    const refreshToken = generateToken(jwtPayload, envVars.JWT_REFRESH_SECRET, envVars.JWT_REFRESH_EXPIRES);

    return {
        accessToken,
        refreshToken
    }
}

export const createNewAccessTokenWitRefreshToken = async (refreshToken: string) => {
    const verifiedRefreshToken = verifyToken(refreshToken, envVars.JWT_REFRESH_SECRET) as JwtPayload

    const isUserExist = await prisma.user.findUnique({
        where: {
            id: verifiedRefreshToken.userId
        }
    })

    if (!isUserExist) {
        throw new AppError(status.BAD_REQUEST, "User doesn't exist")

    }

    if (isUserExist.status === Status.INACTIVE || isUserExist.status === Status.BLOCKED) {
        throw new AppError(status.FORBIDDEN, `User is ${isUserExist.status}`)
    }

    if (isUserExist.isDeleted) {
        throw new AppError(status.FORBIDDEN, "User is deleted")
    }

    const jwtPayload = {
        userId: isUserExist.id,
        email: isUserExist.email,
        role: isUserExist.role
    }
    const generateAccessToken = generateToken(jwtPayload, envVars.JWT_ACCESS_SECRET, envVars.JWT_ACCESS_EXPIRES);
    const generateRefreshToken = generateToken(jwtPayload, envVars.JWT_REFRESH_SECRET, envVars.JWT_REFRESH_EXPIRES);

    return {
        accessToken: generateAccessToken,
        refreshToken: generateRefreshToken
    }
}
