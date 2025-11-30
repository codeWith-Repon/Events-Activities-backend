import { Request, Response } from "express";
import { UserService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { User } from "../../../generated/prisma/client";

const createUser = catchAsync(
    async (req: Request, res: Response) => {
        const result = await UserService.createUser(req.body)
        sendResponse(res, {
            statusCode: status.CREATED,
            success: true,
            message: "User created successfully",
            data: result
        })
    }
)

const getAllUsers = catchAsync(
    async (req: Request, res: Response) => {
        const result = await UserService.getAllUsers()
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User retrieved successfully",
            data: result
        })
    }
)

const getUserById = catchAsync(
    async (req: Request, res: Response) => {
        const { userId } = req.params
        const result = await UserService.getUserById(userId as string)
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User retrieved successfully",
            data: result
        })
    }
)

const updateUser = catchAsync(
    async (req: Request, res: Response) => {
        const payload: User = {
            ...req.body,
            profileImage: req.file ? req.file?.path : undefined
        }
        const result = await UserService.updateUser(payload, req.user)
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User updated successfully",
            data: result
        })
    }
)

const getMe = catchAsync(
    async (req: Request, res: Response) => {

        const result = await UserService.getMe(req.user)
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User profile fetched successfully",
            data: result
        })
    }
)

export const UserController = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    getMe
}