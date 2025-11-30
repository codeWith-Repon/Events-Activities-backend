import { Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.validation";

const router = Router()

router.post("/register", validateRequest(createUserSchema), UserController.createUser);
router.get("/", UserController.getAllUsers);
router.get("/:userId", UserController.getUserById);
router.patch("/:userId", validateRequest(updateUserSchema), UserController.updateUser);


export const UserRoutes: Router = router