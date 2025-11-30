
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { AuthService } from "./auth.service";


const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const result = await AuthService.loginUser(req.body)

        if (result.accessToken) {
            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 1000 * 60 * 60 * 24 * 7
            })
        }
        if (result.refreshToken) {
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 1000 * 60 * 60 * 24 * 30
            })
        }
        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: result
        })
    }
)

export const AuthController = {
    loginUser
}
