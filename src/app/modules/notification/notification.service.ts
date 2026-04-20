import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { NotificationType } from "../../../generated/prisma/client";
import { sendEmail } from "../../utils/sendEmail";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  emailHtml?: string;
}

// Fire-and-forget helper called from other services
export const notify = async (params: NotifyParams): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message
      }
    });

    if (params.emailHtml) {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true }
      });
      if (user) {
        await sendEmail({ to: user.email, subject: params.title, html: params.emailHtml });
      }
    }
  } catch (err) {
    console.error("[Notification failed]", err);
  }
};

// Get all notifications for the logged-in user
const getMyNotifications = async (decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
};

// Mark a single notification as read
const markAsRead = async (notificationId: string, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new AppError(status.NOT_FOUND, "Notification not found");
  if (notification.userId !== userId) throw new AppError(status.FORBIDDEN, "Not your notification");

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true }
  });
};

// Mark all as read for the logged-in user
const markAllAsRead = async (decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });

  return { updated: count };
};

// Delete a single notification
const deleteNotification = async (notificationId: string, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new AppError(status.NOT_FOUND, "Notification not found");
  if (notification.userId !== userId) throw new AppError(status.FORBIDDEN, "Not your notification");

  return prisma.notification.delete({ where: { id: notificationId } });
};

// Unread count for the logged-in user
const getUnreadCount = async (decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  return { unread: count };
};

export const notificationService = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
};
