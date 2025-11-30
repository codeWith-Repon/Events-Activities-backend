
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { AuthService } from "./auth.service";
import { setAuthCookie } from "../../utils/setCookie";


const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const result = await AuthService.loginUser(req.body)

        setAuthCookie(res, result)

        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: result
        })
    }
)

const getNewToken = catchAsync(
    async (req: Request, res: Response) => {
        const result = await AuthService.getNewToken(req.cookies.refreshToken)

        setAuthCookie(res, result)

        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Token refreshed successfully",
            data: result
        })
    }
)

const resetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const result = await AuthService.resetPassword(req.body, req.user)

        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Password reset successfully",
            data: result
        })
    }
)

const changePassword = catchAsync(
    async (req: Request, res: Response) => {
        const result = await AuthService.changePassword(req.body, req.user)

        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "Password changed successfully",
            data: result
        })
    }
)

export const AuthController = {
    loginUser,
    getNewToken,
    resetPassword,
    changePassword
}
