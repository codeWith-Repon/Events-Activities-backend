import { Router } from "express";
import { ratingController } from "./rating.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createRatingSchema,
  updateRatingSchema
} from "./rating.validation";
import { UserRole } from "../../../generated/prisma/client";

const router = Router();

// Create a new rating (authenticated, for completed events)
router.post(
  "/create",
  checkAuth(
    UserRole.USER,
    UserRole.HOST,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  validateRequest(createRatingSchema),
  ratingController.createRating
);

// Get all ratings for a specific event (public)
router.get("/events/:eventId", ratingController.listEventRatings);

// Get all ratings submitted by a user (public)
router.get("/users/:userId", ratingController.listUserRatings);

// Get a specific rating by ID (public)
router.get("/:ratingId", ratingController.getRatingById);

// Update a rating (authenticated, creator only)
router.patch(
  "/:ratingId",
  checkAuth(
    UserRole.USER,
    UserRole.HOST,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  validateRequest(updateRatingSchema),
  ratingController.updateRating
);

// Delete a rating (authenticated, creator or admin)
router.delete(
  "/:ratingId",
  checkAuth(
    UserRole.USER,
    UserRole.HOST,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  ratingController.deleteRating
);

export const ratingRoutes: Router = router;
