
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

export const AuthController = {
    loginUser
}
