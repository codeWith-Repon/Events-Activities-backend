import { Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";


const router: Router = Router()

router.post(
    "/login",
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
    AuthController.resetPassword
)

router.post(
    "/change-password",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    AuthController.changePassword
)

router.post(
    "/forgot-password",
    AuthController.forgotPassword
)

router.post(
    "/reset-password-token",
    AuthController.resetPasswordWithToken
)

export const AuthRoutes = router