import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { checkinService } from "./checkin.service";

const getMyQRCode = catchAsync(async (req: Request, res: Response) => {
  const result = await checkinService.getMyQRCode(req.params.participantId as string, req.user!);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Check-in token retrieved", data: result });
});

const checkIn = catchAsync(async (req: Request, res: Response) => {
  const result = await checkinService.checkIn(req.body.token as string, req.user!);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Checked in successfully", data: result });
});

const getEventAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await checkinService.getEventAttendance(req.params.eventId as string, req.user!);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Attendance retrieved", data: result });
});

export const checkinController = { getMyQRCode, checkIn, getEventAttendance };
