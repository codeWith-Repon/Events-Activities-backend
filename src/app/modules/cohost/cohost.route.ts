import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { cohostController } from "./cohost.controller";

const router: Router = Router();

router.get(
  "/events/:eventId",
  cohostController.listCoHosts
);

router.post(
  "/events/:eventId",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  cohostController.addCoHost
);

router.delete(
  "/events/:eventId/:hostId",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  cohostController.removeCoHost
);

export const cohostRoutes = router;
