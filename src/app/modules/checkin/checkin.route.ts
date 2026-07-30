import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { checkinController } from "./checkin.controller";

const router: Router = Router();

// Participant gets their own QR code
router.get(
  "/qr/:participantId",
  checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  checkinController.getMyQRCode
);

// Host scans QR and checks in participant
router.post(
  "/",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  checkinController.checkIn
);

// Host views attendance summary for an event
router.get(
  "/attendance/:eventId",
  checkAuth(UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  checkinController.getEventAttendance
);

export const checkinRoutes = router;
