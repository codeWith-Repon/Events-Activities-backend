import { Router } from "express";
import { invitationController } from "./invitation.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { sendInvitationSchema } from "./invitation.validation";
import { UserRole } from "../../../generated/prisma/client";

const router = Router();

const anyRole = [UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN];

// Host sends an invitation
router.post(
  "/send",
  checkAuth(...anyRole),
  validateRequest(sendInvitationSchema),
  invitationController.sendInvitation
);

// Authenticated user accepts via token from the link
router.post("/accept/:token", checkAuth(...anyRole), invitationController.acceptInvitation);

// Authenticated user declines via token
router.post("/decline/:token", checkAuth(...anyRole), invitationController.declineInvitation);

// Host revokes a pending invitation
router.patch(
  "/revoke/:invitationId",
  checkAuth(...anyRole),
  invitationController.revokeInvitation
);

// Host lists all invitations for their event
router.get("/events/:eventId", checkAuth(...anyRole), invitationController.listEventInvitations);

export const invitationRoutes: Router = router;
