import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { reportService } from "./report.service";
import pick from "../../helpers/pick";

const createReport = catchAsync(async (req: Request, res: Response) => {
  const result = await reportService.createReport(req.body, req.user!);
  sendResponse(res, { statusCode: status.CREATED, success: true, message: "Report submitted", data: result });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["type", "status"]);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await reportService.getAllReports(filters, options);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Reports retrieved", data: result });
});

const resolveReport = catchAsync(async (req: Request, res: Response) => {
  const result = await reportService.resolveReport(req.params.reportId as string, req.body);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Report updated", data: result });
});

export const reportController = { createReport, getAllReports, resolveReport };
