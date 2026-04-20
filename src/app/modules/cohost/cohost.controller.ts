import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { cohostService } from "./cohost.service";

const addCoHost = catchAsync(async (req: Request, res: Response) => {
  const result = await cohostService.addCoHost(req.params.eventId as string, req.body.userId, req.user!);
  sendResponse(res, { statusCode: status.CREATED, success: true, message: "Co-host added", data: result });
});

const removeCoHost = catchAsync(async (req: Request, res: Response) => {
  await cohostService.removeCoHost(req.params.eventId as string, req.params.hostId as string, req.user!);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Co-host removed", data: null });
});

const listCoHosts = catchAsync(async (req: Request, res: Response) => {
  const result = await cohostService.listCoHosts(req.params.eventId as string);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Co-hosts retrieved", data: result });
});

export const cohostController = { addCoHost, removeCoHost, listCoHosts };
