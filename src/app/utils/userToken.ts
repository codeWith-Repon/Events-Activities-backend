import { User } from "../../generated/prisma/client";
import { envVars } from "../config/env";
import { generateToken } from "./jwt";


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
