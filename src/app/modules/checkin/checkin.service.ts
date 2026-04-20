import crypto from "crypto";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { JoinStatus } from "../../../generated/prisma/client";

export const generateCheckInToken = () => crypto.randomBytes(16).toString("hex");

const getMyQRCode = async (participantId: string, decodedToken: JwtPayload) => {
  const participant = await prisma.eventParticipant.findUnique({
    where: { id: participantId },
    include: { event: { select: { hostId: true, title: true, date: true } } }
  });

  if (!participant) throw new AppError(status.NOT_FOUND, "Participant not found");

  const isOwner = participant.userId === decodedToken.userId;
  const host = await prisma.host.findUnique({ where: { userId: decodedToken.userId } });
  const isHost = host?.id === participant.event.hostId;

  if (!isOwner && !isHost) throw new AppError(status.FORBIDDEN, "Not authorized");
  if (participant.joinStatus !== JoinStatus.APPROVED) {
    throw new AppError(status.BAD_REQUEST, "Check-in QR is only available for approved participants");
  }
  if (!participant.checkInToken) throw new AppError(status.INTERNAL_SERVER_ERROR, "Check-in token missing");

  // Return the raw token — the frontend renders the QR code from this
  return {
    checkInToken: participant.checkInToken,
    eventTitle: participant.event.title,
    eventDate: participant.event.date
  };
};

const checkIn = async (token: string, decodedToken: JwtPayload) => {
  const participant = await prisma.eventParticipant.findUnique({
    where: { checkInToken: token },
    include: { event: true }
  });

  if (!participant) throw new AppError(status.NOT_FOUND, "Invalid check-in token");
  if (participant.checkedIn) throw new AppError(status.BAD_REQUEST, "Already checked in");
  if (participant.joinStatus !== JoinStatus.APPROVED) {
    throw new AppError(status.BAD_REQUEST, "Participant is not approved");
  }

  const host = await prisma.host.findUnique({ where: { userId: decodedToken.userId } });
  if (!host || host.id !== participant.event.hostId) {
    throw new AppError(status.FORBIDDEN, "Only the event host can check in participants");
  }

  const eventDate = new Date(participant.event.date);
  const now = new Date();
  if (eventDate.toDateString() !== now.toDateString()) {
    throw new AppError(status.BAD_REQUEST, "Check-in is only available on event day");
  }

  const updated = await prisma.eventParticipant.update({
    where: { id: participant.id },
    data: { checkedIn: true, checkedInAt: now }
  });

  return updated;
};

const getEventAttendance = async (eventId: string, decodedToken: JwtPayload) => {
  const host = await prisma.host.findUnique({ where: { userId: decodedToken.userId } });
  if (!host) throw new AppError(status.FORBIDDEN, "Only hosts can view attendance");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
  if (event.hostId !== host.id) throw new AppError(status.FORBIDDEN, "Not your event");

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId, joinStatus: JoinStatus.APPROVED },
    select: {
      id: true,
      checkedIn: true,
      checkedInAt: true,
      user: { select: { name: true, email: true, profileImage: true } }
    },
    orderBy: { checkedInAt: "desc" }
  });

  const total = participants.length;
  const attended = participants.filter(p => p.checkedIn).length;

  return { total, attended, absent: total - attended, participants };
};

export const checkinService = { getMyQRCode, checkIn, getEventAttendance };
