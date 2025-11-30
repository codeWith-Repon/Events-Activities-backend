import { Router } from "express";
import { AuthController } from "./auth.controller";


const router: Router = Router()

router.post(
    "/login",
    AuthController.loginUser
)

export const AuthRoutes = router