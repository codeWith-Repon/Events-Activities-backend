import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { eventParticipantSchema, updateParticipantSchema } from "./eventParticipant.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { EventParticipantController } from "./eventParticipant.controller";


const router: Router = Router()

router.post(
    "/join-event",
    checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    validateRequest(eventParticipantSchema),
    EventParticipantController.createEventParticipant

)

router.get(
    "/",
    // checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    EventParticipantController.getAllEventParticipants
)

router.get(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    EventParticipantController.getEventParticipantById
)

router.patch(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    validateRequest(updateParticipantSchema),
    EventParticipantController.updateEventParticipantById
)

router.delete(
    "/:id",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER, UserRole.HOST),
    EventParticipantController.deleteEventParticipantById
)

export const EventParticipantRoutes = router