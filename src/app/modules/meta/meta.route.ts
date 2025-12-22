import { Router } from "express";
import { AdminController } from "./meta.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";


const router: Router = Router()

router.get(
    "/meta-data",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    AdminController.getMetaData
)

export const MetaRoutes = router