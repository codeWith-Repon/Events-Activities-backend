import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AdminService } from "./meta.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";


const getMetaData = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAdminDashboardMetaData(req.query)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin dashboard meta data retrieved successfully",
        data: result
    })
})

export const AdminController = {
    getMetaData
}