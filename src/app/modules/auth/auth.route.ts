import { Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { UserRole } from "../../../generated/prisma/enums";
import {
    loginSchema,
    changePasswordSchema,
    resetPasswordSchema,
    forgotPasswordSchema,
    resetPasswordWithTokenSchema
} from "./auth.validation";


const router: Router = Router()

router.post(
    "/login",
    validateRequest(loginSchema),
    AuthController.loginUser
)

router.post(
    "/logout",
    AuthController.logOutUser
)

router.post(
    "/get-new-token",
    AuthController.getNewToken
)

router.post(
    "/reset-password",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    validateRequest(resetPasswordSchema),
    AuthController.resetPassword
)

router.post(
    "/change-password",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    validateRequest(changePasswordSchema),
    AuthController.changePassword
)

router.post(
    "/forgot-password",
    validateRequest(forgotPasswordSchema),
    AuthController.forgotPassword
)

router.post(
    "/reset-password-token",
    validateRequest(resetPasswordWithTokenSchema),
    AuthController.resetPasswordWithToken
)

export const AuthRoutes = router