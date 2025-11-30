import { Request, Response } from "express";
import { UserService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";

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

export const UserController = {
    createUser
}