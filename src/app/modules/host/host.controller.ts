import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { hostService } from "./host.service";
import pick from "../../helpers/pick";

const getAllHosts = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await hostService.getAllHosts(options);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Hosts retrieved", data: result });
});

const getHostStats = catchAsync(async (req: Request, res: Response) => {
  const result = await hostService.getHostStats(req.params.hostId as string);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Host stats retrieved", data: result });
});

const setHostVerification = catchAsync(async (req: Request, res: Response) => {
  const result = await hostService.setHostVerification(req.params.hostId as string, req.body.isVerified);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Host verification updated", data: result });
});

export const hostController = { getAllHosts, getHostStats, setHostVerification };
