import { Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.validation";
import { multerUpload } from "../../config/multer.config";
import { UserRole } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middlewares/checkAuth";

const router = Router()

router.post(
    "/register",
    validateRequest(createUserSchema),
    UserController.createUser
);

router.get(
    "/",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    UserController.getAllUsers
);

router.get(
    "/:userId",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    UserController.getUserById
);

router.patch(
    "/",
    checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    multerUpload.single("file"),
    validateRequest(updateUserSchema),
    UserController.updateUser
);


export const UserRoutes: Router = router