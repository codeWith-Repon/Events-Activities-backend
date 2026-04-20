import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

const addCoHost = async (eventId: string, userId: string, decodedToken: JwtPayload) => {
  const primaryHost = await prisma.host.findUnique({ where: { userId: decodedToken.userId } });
  if (!primaryHost) throw new AppError(status.FORBIDDEN, "Only hosts can manage co-hosts");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
  if (event.hostId !== primaryHost.id) throw new AppError(status.FORBIDDEN, "Only the primary host can add co-hosts");

  const targetHost = await prisma.host.findUnique({ where: { userId } });
  if (!targetHost) throw new AppError(status.NOT_FOUND, "Target user is not a host");
  if (targetHost.id === primaryHost.id) throw new AppError(status.BAD_REQUEST, "You are already the primary host");

  const existing = await prisma.eventCoHost.findUnique({
    where: { eventId_hostId: { eventId, hostId: targetHost.id } }
  });
  if (existing) throw new AppError(status.BAD_REQUEST, "User is already a co-host for this event");

  const coHost = await prisma.eventCoHost.create({
    data: { eventId, hostId: targetHost.id },
    include: { host: { include: { user: { select: { name: true, email: true, profileImage: true } } } } }
  });

  return coHost;
};

const removeCoHost = async (eventId: string, coHostId: string, decodedToken: JwtPayload) => {
  const primaryHost = await prisma.host.findUnique({ where: { userId: decodedToken.userId } });
  if (!primaryHost) throw new AppError(status.FORBIDDEN, "Only hosts can manage co-hosts");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
  if (event.hostId !== primaryHost.id) throw new AppError(status.FORBIDDEN, "Only the primary host can remove co-hosts");

  const coHost = await prisma.eventCoHost.findUnique({
    where: { eventId_hostId: { eventId, hostId: coHostId } }
  });
  if (!coHost) throw new AppError(status.NOT_FOUND, "Co-host not found for this event");

  await prisma.eventCoHost.delete({ where: { id: coHost.id } });
};

const listCoHosts = async (eventId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(status.NOT_FOUND, "Event not found");

  return prisma.eventCoHost.findMany({
    where: { eventId },
    include: {
      host: { include: { user: { select: { name: true, email: true, profileImage: true } } } }
    },
    orderBy: { assignedAt: "asc" }
  });
};

export const cohostService = { addCoHost, removeCoHost, listCoHosts };
