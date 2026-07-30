import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { hostController } from "./host.controller";

const router: Router = Router();

router.get(
  "/",
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  hostController.getAllHosts
);

router.get(
  "/:hostId/stats",
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  hostController.getHostStats
);

router.patch(
  "/:hostId/verify",
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  hostController.setHostVerification
);

export const hostRoutes = router;
