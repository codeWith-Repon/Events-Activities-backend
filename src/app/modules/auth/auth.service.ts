import { prisma } from "../../../lib/prisma";
import bcryptjs from "bcryptjs"
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { createUserToken } from "../../utils/userToken";


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

export const AuthService = {
    loginUser
}
