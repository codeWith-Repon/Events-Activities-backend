import { prisma } from "../../../lib/prisma"
import AppError from "../../errorHelpers/AppError"
import { CreateUserInput } from "./user.interface"
import status from "http-status"
import bcryptjs from "bcryptjs"
import { envVars } from "../../config/env"
import { User } from "../../../generated/prisma/client"

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
    const { password, ...softData } = result
    return softData
}

const getAllUsers = async () => {
    const result = await prisma.user.findMany()
    return result
}

const getUserById = async (id: string) => {
    const result = await prisma.user.findUniqueOrThrow({
        where: {
            id
        }
    })

    return result
}

const updateUser = async (id: string, payload: User) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            id
        }
    })

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, "User not found")
    }

    const result = await prisma.user.update({
        where: {
            id
        },
        data: payload
    })

    return result
}

export const UserService = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser
}