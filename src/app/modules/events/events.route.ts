import { Router } from "express";
import { EventsController } from "./events.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { createEventSchema, updateEventSchema } from "./events.validation";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { multerUpload } from "../../config/multer.config";


const router: Router = Router()

router.post(
    "/create-event",
    checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    multerUpload.array("files"),
    validateRequest(createEventSchema),
    EventsController.createEvent
)

router.get(
    "/",
    EventsController.getAllEvents
)

router.get(
    "/category",
    EventsController.getAllEventsCategory
)

router.patch(
    "/update/:slug",
    checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    multerUpload.array("files"),
    validateRequest(updateEventSchema),
    EventsController.updateEvent
)

router.get(
    "/:slug",
    EventsController.getEventBySlug
)
router.delete(
    "/:slug",
    checkAuth(UserRole.USER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    EventsController.deleteEvent
)

export const EventsRoutes = router