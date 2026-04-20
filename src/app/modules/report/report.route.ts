import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { reportController } from "./report.controller";

const router: Router = Router();

router.post(
  "/",
  checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  reportController.createReport
);

router.get(
  "/",
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  reportController.getAllReports
);

router.patch(
  "/:reportId",
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  reportController.resolveReport
);

export const reportRoutes = router;
