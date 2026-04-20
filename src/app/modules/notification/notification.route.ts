import { Router } from "express";
import { notificationController } from "./notification.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/client";

const router = Router();
const anyRole = [UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN];

router.get("/",            checkAuth(...anyRole), notificationController.getMyNotifications);
router.get("/unread-count", checkAuth(...anyRole), notificationController.getUnreadCount);
router.patch("/read-all",  checkAuth(...anyRole), notificationController.markAllAsRead);
router.patch("/:notificationId/read", checkAuth(...anyRole), notificationController.markAsRead);
router.delete("/:notificationId",     checkAuth(...anyRole), notificationController.deleteNotification);

export const notificationRoutes: Router = router;
