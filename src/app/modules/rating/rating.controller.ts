import { Request, Response } from "express";
import { ratingService } from "./rating.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import pick from "../../helpers/pick";
import {
  eventRatingFilterableFields,
  userRatingFilterableFields
} from "./rating.constants";

const createRating = catchAsync(async (req: Request, res: Response) => {
  const result = await ratingService.createRating(req.body, req.user);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Rating created successfully",
    data: result
  });
});

const updateRating = catchAsync(async (req: Request, res: Response) => {
  const { ratingId } = req.params as { ratingId: string };
  const result = await ratingService.updateRating(
    ratingId,
    req.body,
    req.user
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Rating updated successfully",
    data: result
  });
});

const deleteRating = catchAsync(async (req: Request, res: Response) => {
  const { ratingId } = req.params as { ratingId: string };
  await ratingService.deleteRating(ratingId, req.user);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Rating deleted successfully",
    data: null
  });
});

const getRatingById = catchAsync(async (req: Request, res: Response) => {
  const { ratingId } = req.params as { ratingId: string };
  const result = await ratingService.getRatingById(ratingId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Rating retrieved successfully",
    data: result
  });
});

const listEventRatings = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params as { eventId: string };
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const filter = pick(req.query, eventRatingFilterableFields);

  const result = await ratingService.listEventRatings(
    eventId,
    filter,
    options
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Event ratings retrieved successfully",
    meta: result.meta,
    data: result.data
  });
});

const listUserRatings = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const filter = pick(req.query, userRatingFilterableFields);

  const result = await ratingService.listUserRatings(userId, filter, options);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User ratings retrieved successfully",
    meta: result.meta,
    data: result.data
  });
});

export const ratingController = {
  createRating,
  updateRating,
  deleteRating,
  getRatingById,
  listEventRatings,
  listUserRatings
};
