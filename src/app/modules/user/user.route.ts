import { Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.validation";
import { multerUpload } from "../../config/multer.config";

const router = Router()

router.post(
    "/register",
    validateRequest(createUserSchema),
    UserController.createUser
);

router.get(
    "/",
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