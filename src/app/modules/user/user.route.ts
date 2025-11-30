import { Router } from "express";
import { UserController } from "./user.controller";
import { envVars } from "../../config/env";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserSchema } from "./user.validation";

const router = Router()

router.post("/create", validateRequest(createUserSchema), UserController.createUser);


export const UserRoute: Router = router