import { prisma } from "../../../lib/prisma"
import AppError from "../../errorHelpers/AppError"
import { CreateUserInput } from "./user.interface"
import status from "http-status"
import bcryptjs from "bcryptjs"
import { envVars } from "../../config/env"
import { User } from "../../../generated/prisma/client"
import { sanitizeUser } from "../../helpers/sanitizeUser"
import { deleteImageFromCloudinary } from "../../config/cloudinary.config"
import { JwtPayload } from "jsonwebtoken"

const createUser = async (payload: CreateUserInput) => {
    const existingUser = await prisma.user.findUnique({
        where: {
            email: payload.email
        }
    })

    if (existingUser) {
        throw new AppError(status.BAD_REQUEST, "User already exists")
    }

    const hashedPassword = await bcryptjs.hash(payload.password, Number(envVars.BCRYPT_SALT_ROUND))

    const result = await prisma.user.create({
        data: {
            name: payload.name,
            email: payload.email,
            password: hashedPassword
        }
    })
    const safeUser = sanitizeUser(result, ["password"])

    return safeUser
}

const getAllUsers = async () => {
    const users = await prisma.user.findMany()
    const result = users.map((user) => sanitizeUser(user, ["password"]))
    return result
}

const getUserById = async (id: string) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: {
            id
        }
    })

    const result = sanitizeUser(user, ["password"])
    return result
}

const updateUser = async (payload: User, decodedToken: JwtPayload) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            id: decodedToken.userId
        }
    })

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found")
    }

    if (payload.profileImage && isUserExist.profileImage) {
        await deleteImageFromCloudinary(isUserExist.profileImage)
    }

    const updatedUser = await prisma.user.update({
        where: {
            id: decodedToken.userId
        },
        data: payload
    })

    const result = sanitizeUser(updatedUser, ["password"])
    return result
}

const getMe = async (decodedToken: JwtPayload) => {

    const result = await prisma.user.findUniqueOrThrow({
        where: {
            id: decodedToken.userId
        }
    })

    const user = sanitizeUser(result, ["password"])

    return user
}

export const UserService = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    getMe
}