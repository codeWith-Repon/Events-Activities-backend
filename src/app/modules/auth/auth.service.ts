import { prisma } from "../../../lib/prisma";
import bcryptjs from "bcryptjs"
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken"
import { envVars } from "../../config/env";
import { sanitizeUser } from "../../helpers/sanitizeUser";

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

    const jwtPayload = {
        userId: isUserExist.id,
        email: isUserExist.email,
        role: isUserExist.role
    }
    const accessToken = jwt.sign(jwtPayload as JwtPayload, envVars.JWT_ACCESS_SECRET, {
        expiresIn: envVars.JWT_ACCESS_EXPIRES
    } as SignOptions)
    const refreshToken = jwt.sign(jwtPayload as JwtPayload, envVars.JWT_REFRESH_SECRET, {
        expiresIn: envVars.JWT_REFRESH_EXPIRES
    } as SignOptions)

    const user = sanitizeUser(isUserExist, ["password"])

    return {
        accessToken,
        refreshToken,
        user
    }
}

export const AuthService = {
    loginUser
}
