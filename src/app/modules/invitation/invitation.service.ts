import { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { EventStatus, InvitationStatus, JoinStatus, PaymentStatus } from "../../../generated/prisma/client";
import { ISendInvitation } from "./invitation.interface";
import { INVITATION_EXPIRY_DAYS } from "./invitation.constants";
import { sendEmail, buildInvitationEmail } from "../../utils/sendEmail";
import { envVars } from "../../config/env";

const sendInvitation = async (payload: ISendInvitation, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  const host = await prisma.host.findUnique({ where: { userId } });
  if (!host) throw new AppError(status.FORBIDDEN, "Only hosts can send invitations");

  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
    include: { host: { include: { user: { select: { name: true } } } } }
  });

  if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
  if (event.hostId !== host.id) throw new AppError(status.FORBIDDEN, "You can only invite to your own events");

  const blockedStatuses: EventStatus[] = [EventStatus.CANCELLED, EventStatus.COMPLETED];
  if (blockedStatuses.includes(event.status)) {
    throw new AppError(status.BAD_REQUEST, `Cannot invite to a ${event.status.toLowerCase()} event`);
  }

  const existing = await prisma.eventInvitation.findUnique({
    where: { eventId_email: { eventId: payload.eventId, email: payload.email } }
  });

  if (existing && existing.status === InvitationStatus.PENDING) {
    throw new AppError(status.CONFLICT, "An active invitation already exists for this email");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const baseUrl = envVars.NODE_ENV === "production" ? envVars.FRONTEND_LIVE_URL : envVars.FRONTEND_URL;
  const inviteLink = `${baseUrl}/events/invite/accept?token=${token}`;

  // Upsert so re-inviting after REVOKED/DECLINED creates a fresh invitation
  const invitation = await prisma.eventInvitation.upsert({
    where: { eventId_email: { eventId: payload.eventId, email: payload.email } },
    update: { token, status: InvitationStatus.PENDING, expiresAt },
    create: {
      eventId: payload.eventId,
      hostId: host.id,
      email: payload.email,
      token,
      expiresAt
    }
  });

  await sendEmail({
    to: payload.email,
    subject: `You're invited to ${event.title}`,
    html: buildInvitationEmail({
      eventTitle: event.title,
      hostName: event.host.user.name,
      inviteLink,
      expiresAt
    })
  });

  return { invitation, inviteLink };
};

const acceptInvitation = async (token: string, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.eventInvitation.findUnique({
      where: { token },
      include: { event: true }
    });

    if (!invitation) throw new AppError(status.NOT_FOUND, "Invitation not found");
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError(status.BAD_REQUEST, `Invitation has already been ${invitation.status.toLowerCase()}`);
    }
    if (invitation.expiresAt < new Date()) {
      await tx.eventInvitation.update({ where: { token }, data: { status: InvitationStatus.DECLINED } });
      throw new AppError(status.GONE, "Invitation has expired");
    }

    const { event } = invitation;
    const blockedStatuses: EventStatus[] = [EventStatus.CANCELLED, EventStatus.COMPLETED];
    if (blockedStatuses.includes(event.status)) {
      throw new AppError(status.BAD_REQUEST, `Event is ${event.status.toLowerCase()}`);
    }

    const alreadyJoined = await tx.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } }
    });
    if (alreadyJoined) throw new AppError(status.CONFLICT, "You have already joined this event");

    const isFree = event.fee === 0;

    const participant = await tx.eventParticipant.create({
      data: {
        eventId: event.id,
        userId,
        joinStatus: JoinStatus.APPROVED,
        paymentStatus: isFree ? PaymentStatus.PAID : PaymentStatus.PENDING
      }
    });

    await tx.eventInvitation.update({
      where: { token },
      data: { status: InvitationStatus.ACCEPTED }
    });

    return participant;
  });
};

const declineInvitation = async (token: string, decodedToken: JwtPayload) => {
  const invitation = await prisma.eventInvitation.findUnique({ where: { token } });

  if (!invitation) throw new AppError(status.NOT_FOUND, "Invitation not found");
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(status.BAD_REQUEST, `Invitation is already ${invitation.status.toLowerCase()}`);
  }

  return prisma.eventInvitation.update({
    where: { token },
    data: { status: InvitationStatus.DECLINED }
  });
};

const revokeInvitation = async (invitationId: string, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  const host = await prisma.host.findUnique({ where: { userId } });
  if (!host) throw new AppError(status.FORBIDDEN, "Only hosts can revoke invitations");

  const invitation = await prisma.eventInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new AppError(status.NOT_FOUND, "Invitation not found");
  if (invitation.hostId !== host.id) throw new AppError(status.FORBIDDEN, "You can only revoke your own invitations");
  if (invitation.status !== InvitationStatus.PENDING) {
    throw new AppError(status.BAD_REQUEST, `Invitation is already ${invitation.status.toLowerCase()}`);
  }

  return prisma.eventInvitation.update({
    where: { id: invitationId },
    data: { status: InvitationStatus.REVOKED }
  });
};

const listEventInvitations = async (eventId: string, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  const host = await prisma.host.findUnique({ where: { userId } });
  if (!host) throw new AppError(status.FORBIDDEN, "Only hosts can view invitations");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
  if (event.hostId !== host.id) throw new AppError(status.FORBIDDEN, "You can only view invitations for your own events");

  return prisma.eventInvitation.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" }
  });
};

export const invitationService = {
  sendInvitation,
  acceptInvitation,
  declineInvitation,
  revokeInvitation,
  listEventInvitations
};
