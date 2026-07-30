import { prisma } from "../../../lib/prisma"
import AppError from "../../errorHelpers/AppError"
import { CreateUserInput } from "./user.interface"
import status from "http-status"
import bcryptjs from "bcryptjs"
import { envVars } from "../../config/env"
import { Prisma, User } from "../../../generated/prisma/client"
import { sanitizeUser } from "../../helpers/sanitizeUser"
import { deleteImageFromCloudinary } from "../../config/cloudinary.config"
import { JwtPayload } from "jsonwebtoken"
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper"
import { userSearchableFields } from "./user.constant"

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

const getAllUsers = async (filter: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = PaginationHelpers.calculatePagination(options)
    const { searchTerm, ...filterData } = filter

    const andConditions: Prisma.UserWhereInput[] = []

    if (searchTerm) {
        andConditions.push({
            OR: userSearchableFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        })
    }

    if (Object.keys(filterData).length > 0) {
        const filterConditions = Object.keys(filterData).map((key) => {
            return {
                [key]: {
                    equals: filterData[key]
                }
            }
        })
        andConditions.push({
            AND: filterConditions
        })
    }

    andConditions.push({
        isDeleted: false
    })

    const whereConditions: Prisma.UserWhereInput = andConditions.length > 0 ? { AND: andConditions } : {}

    const users = await prisma.user.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
            [sortBy]: sortOrder
        }
    })

    const total = await prisma.user.count({
        where: whereConditions
    })

    const totalPage = Math.ceil(total / limit)


    const result = users.map((user) => sanitizeUser(user, ["password"]))
    return {
        meta: {
            page,
            limit,
            totalPage,
            total
        },
        data: result
    }
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
        },
        include: {
            hosts: true
        }
    })

    const user = sanitizeUser(result, ["password"])

    return user
}

const deleteUser = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    })

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found")
    }
    await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            isDeleted: true
        }
    })

    return {
        message: "User deleted successfully"
    }
}

const updateUserStatus = async (userId: string, newStatus: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId, isDeleted: false } });
    if (!user) throw new AppError(status.NOT_FOUND, "User not found");

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus as any }
    });
    return sanitizeUser(updated, ["password"]);
};

const changeUserRole = async (userId: string, newRole: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId, isDeleted: false } });
    if (!user) throw new AppError(status.NOT_FOUND, "User not found");

    const updated = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { role: newRole as any }
        });

        if (newRole === "HOST") {
            await tx.host.upsert({
                where: { userId },
                update: {},
                create: { userId }
            });
        }

        return updatedUser;
    });

    return sanitizeUser(updated, ["password"]);
};

export const UserService = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    getMe,
    deleteUser,
    updateUserStatus,
    changeUserRole
}