import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import status from "http-status";
import { notificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.getMyNotifications(req.user);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Notifications retrieved", data: result });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { notificationId } = req.params as { notificationId: string };
  const result = await notificationService.markAsRead(notificationId, req.user);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Marked as read", data: result });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user);
  sendResponse(res, { statusCode: status.OK, success: true, message: "All notifications marked as read", data: result });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { notificationId } = req.params as { notificationId: string };
  await notificationService.deleteNotification(notificationId, req.user);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Notification deleted", data: null });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const result = await notificationService.getUnreadCount(req.user);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Unread count", data: result });
});

export const notificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};
