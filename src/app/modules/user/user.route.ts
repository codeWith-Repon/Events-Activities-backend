import { NextFunction, Request, Response, Router } from "express";
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
    UserController.getUserById
);

router.patch(
    "/:userId",
    multerUpload.single("file"),
    validateRequest(updateUserSchema),
    UserController.updateUser
);


export const UserRoutes: Router = router