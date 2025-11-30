import { NextFunction, Request, Response, Router } from "express";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.validation";
import { multerUpload } from "../../config/multer.config";
import jwt, { JwtPayload } from "jsonwebtoken"
import { envVars } from "../../config/env";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router()

router.post(
    "/register",
    validateRequest(createUserSchema),
    UserController.createUser
);

router.get(
    "/",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accessToken = req.cookies.accessToken

            if (!accessToken) {
                throw new Error("No access token found")
            }

            const verifiedToken = jwt.verify(accessToken, envVars.JWT_ACCESS_SECRET)

            if ((verifiedToken as JwtPayload).role !== UserRole.USER) {
                throw new Error("Unauthorized")
            }
            console.log(verifiedToken)
            next()
        } catch (error) {
            next(error)
        }
    },
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