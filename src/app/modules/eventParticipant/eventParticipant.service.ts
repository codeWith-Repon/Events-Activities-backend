import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { EventParticipant, EventStatus, JoinStatus, NotificationType, PaymentStatus, Prisma } from "../../../generated/prisma/client";
import { generateTransactionId } from "../../utils/generateTransactionId";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";
import { eventParticipantSearchableFields } from "./eventParticipant.constants";
import { notify } from "../notification/notification.service";
import {
    buildApprovalEmail,
    buildRejectionEmail,
    buildWaitlistedEmail,
    buildWaitlistPromotedEmail
} from "../../utils/emailTemplates";
import { generateCheckInToken } from "../checkin/checkin.service";
import { getEventHost } from "../../utils/isEventHost";

interface CreateEventParticipantPayload {
    eventId: string;
}

const createEventParticipant = async (
    payload: CreateEventParticipantPayload,
    decodedToken: JwtPayload
) => {
    const userId = decodedToken.userId as string;
    const transactionId = generateTransactionId()

    const result = await prisma.$transaction(async (tx) => {

        // Check event exists
        const existsEvent = await tx.event.findUnique({
            where: { id: payload.eventId }
        });
        if (!existsEvent) throw new AppError(status.NOT_FOUND, "Event not found");

        if (userId === existsEvent.hostId) {
            throw new AppError(status.BAD_REQUEST, "You can't join your own event")
        }

        const blockedStatuses: EventStatus[] = [
            EventStatus.CANCELLED,
            EventStatus.COMPLETED
        ];

        if (blockedStatuses.includes(existsEvent.status as EventStatus)) {
            throw new AppError(status.BAD_REQUEST, `Event is ${existsEvent.status}`);
        }

        // Prevent duplicate participation
        const existsEventParticipant = await tx.eventParticipant.findUnique({
            where: {
                eventId_userId: { eventId: existsEvent.id, userId }
            }
        });

        if (existsEventParticipant)
            throw new AppError(status.BAD_REQUEST, "Already joined this event");

        const isFull = existsEvent.status === EventStatus.FULL;
        const isFree = existsEvent.fee === 0;

        // FULL event → waitlist instead of rejecting
        if (isFull) {
            const waitlisted = await tx.eventParticipant.create({
                data: {
                    userId,
                    eventId: payload.eventId,
                    joinStatus: JoinStatus.WAITLISTED,
                    paymentStatus: PaymentStatus.PENDING
                }
            });
            return { participant: waitlisted, eventTitle: existsEvent.title, joinStatus: JoinStatus.WAITLISTED };
        }

        // Create event participant
        const eventParticipant = await tx.eventParticipant.create({
            data: {
                userId,
                eventId: payload.eventId,
                joinStatus: isFree ? JoinStatus.APPROVED : JoinStatus.PENDING,
                paymentStatus: isFree ? PaymentStatus.PAID : PaymentStatus.PENDING,
                ...(isFree && { checkInToken: generateCheckInToken() })
            }
        });

        if (isFree) {
            const approvedCount = await tx.eventParticipant.count({
                where: { eventId: existsEvent.id, joinStatus: JoinStatus.APPROVED }
            });

            if (approvedCount >= existsEvent.maxParticipants) {
                await tx.event.update({
                    where: { id: existsEvent.id },
                    data: { status: EventStatus.FULL }
                });
            }
        }

        // Create payment record for paid events
        if (!isFree) await tx.payment.create({
            data: {
                userId,
                eventId: payload.eventId,
                participantId: eventParticipant.id,
                amount: existsEvent.fee,
                transactionId: transactionId,
            }
        });
        return { participant: eventParticipant, eventTitle: existsEvent.title, joinStatus: eventParticipant.joinStatus };
    });

    // Fire notification after transaction (non-blocking)
    if (result.joinStatus === JoinStatus.APPROVED) {
        notify({ userId, type: NotificationType.PARTICIPANT_APPROVED, title: "You're in!", message: `Your spot for "${result.eventTitle}" has been confirmed.`, emailHtml: buildApprovalEmail(result.eventTitle) });
    } else if (result.joinStatus === JoinStatus.WAITLISTED) {
        notify({ userId, type: NotificationType.PARTICIPANT_WAITLISTED, title: "Added to waitlist", message: `You're on the waitlist for "${result.eventTitle}".`, emailHtml: buildWaitlistedEmail(result.eventTitle) });
    }

    return result.participant;
};

const getAllEventParticipants = async (filters: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = PaginationHelpers.calculatePagination(options)
    const { searchTerm, ...filterData } = filters

    const andConditions: Prisma.EventParticipantWhereInput[] = []

    // search
    if (searchTerm) {
        andConditions.push({
            OR: eventParticipantSearchableFields.map((field) => {
                const parts = field.split('.')

                if (parts.length === 2) {
                    const [relation, relField] = parts as [string, string]
                    return {
                        [relation]: {
                            [relField]: {
                                contains: searchTerm,
                                mode: 'insensitive'
                            }
                        }
                    }
                } else if (parts.length === 3) {
                    const [relation, nestedRelation, nestedField] = parts as [string, string, string]
                    return {
                        [relation]: {
                            [nestedRelation]: {
                                [nestedField]: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            }
                        }
                    }
                } else {
                    return {
                        [field]: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                }
            })
        })
    }

    // filter
    if (Object.keys(filterData).length > 0) {
        const filterConditions = Object.keys(filterData).map((key) => {
            if (key.includes('.')) {
                const [relation, relField] = key.split('.') as [string, string]
                return {
                    [relation]: {
                        [relField]: {
                            equals: filterData[key]
                        }
                    }
                }
            }
            return { [key]: { equals: filterData[key] } }
        })
        andConditions.push({
            AND: filterConditions
        })
    }

    const whereConditions: Prisma.EventParticipantWhereInput =
        andConditions.length > 0 ? { AND: andConditions } : {};

    const participants = await prisma.eventParticipant.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
            [sortBy]: sortOrder
        },
        include: {
            user: { select: { name: true, email: true, profileImage: true, role: true } },
            event: {
                select: {
                    id: true,
                    title: true, slug: true, description: true, date: true, time: true, location: true, minParticipants: true, maxParticipants: true, images: true, fee: true, category: true, status: true, hostId: true, host: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    profileImage: true,
                                    role: true,
                                    gender: true
                                }
                            }
                        }
                    },
                }
            },
        }
    });

    const total = await prisma.eventParticipant.count({ where: whereConditions });
    const totalPage = Math.ceil(total / limit);

    return {
        meta: { page, limit, totalPage, total },
        data: participants
    };
};

const getEventParticipantById = async (id: string) => {
    const participant = await prisma.eventParticipant.findUnique({
        where: { id },
        include: {
            user: { select: { name: true, email: true, profileImage: true, role: true } },
            event: {
                select: {
                    title: true, description: true, date: true, time: true, location: true,
                    fee: true, images: true, minParticipants: true, maxParticipants: true,
                    category: true, status: true,
                    host: { include: { user: { select: { name: true, email: true, profileImage: true } } } }
                }
            },
        },
    });

    if (!participant) {
        throw new AppError(status.NOT_FOUND, "Event participant not found");
    }

    return participant;
};

const autoApproveNextWaitlisted = async (
    eventId: string,
    tx: any
): Promise<{ promotedUserId?: string; eventTitle?: string }> => {
    const nextWaitlisted = await tx.eventParticipant.findFirst({
        where: { eventId, joinStatus: JoinStatus.WAITLISTED },
        orderBy: { createdAt: "asc" }
    });

    if (!nextWaitlisted) {
        await tx.event.update({
            where: { id: eventId },
            data: { status: EventStatus.OPEN }
        });
        return {};
    }

    const event = await tx.event.findUnique({ where: { id: eventId } });
    const isFree = event.fee === 0;

    await tx.eventParticipant.update({
        where: { id: nextWaitlisted.id },
        data: {
            joinStatus: JoinStatus.APPROVED,
            paymentStatus: isFree ? PaymentStatus.PAID : PaymentStatus.PENDING,
            checkInToken: generateCheckInToken()
        }
    });
    // event stays FULL — one left, one approved
    return { promotedUserId: nextWaitlisted.userId, eventTitle: event.title };
};

const updateEventParticipantById = async (
    eventParticipantId: string,
    decodedToken: JwtPayload,
    payload: Partial<EventParticipant>
) => {
    const { participant, notifyTarget, promoted } = await prisma.$transaction(async (tx) => {
        // 1. find the event participant
        const isParticipantExist = await prisma.eventParticipant.findUnique({
            where: { id: eventParticipantId },
        });

        if (!isParticipantExist) {
            throw new AppError(status.NOT_FOUND, "Participant not found");
        }

        // 2. user cancels their own participation
        const isUserExist = await tx.user.findUnique({ where: { id: decodedToken.userId } });
        if (!isUserExist) throw new AppError(status.NOT_FOUND, "User not found");

        if (isUserExist.id === isParticipantExist.userId && payload.joinStatus === JoinStatus.CANCELLED) {
            const prevJoinStatus = isParticipantExist.joinStatus;

            const updated = await tx.eventParticipant.update({
                where: { id: eventParticipantId },
                data: { joinStatus: JoinStatus.CANCELLED, paymentStatus: PaymentStatus.CANCELLED }
            });

            const payment = await tx.payment.findFirst({ where: { participantId: eventParticipantId } });
            if (payment) {
                await tx.payment.update({ where: { id: payment.id }, data: { paymentStatus: PaymentStatus.CANCELLED } });
            }

            let promoted = {};
            if (prevJoinStatus === JoinStatus.APPROVED) {
                promoted = await autoApproveNextWaitlisted(isParticipantExist.eventId, tx);
            }

            return { participant: updated, notifyTarget: null, promoted };
        }

        // 3. host or co-host updates a participant
        const hostInfo = await getEventHost(decodedToken.userId, isParticipantExist.eventId, tx);
        if (!hostInfo) throw new AppError(status.FORBIDDEN, "You are not allowed to update this event participant");

        const participantEvent = await tx.event.findUnique({ where: { id: isParticipantExist.eventId } });
        if (!participantEvent) throw new AppError(status.NOT_FOUND, "Event not found");

        const prevJoinStatus = isParticipantExist.joinStatus;

        const isApproving = payload.joinStatus === JoinStatus.APPROVED;
        const updated = await tx.eventParticipant.update({
            where: { id: eventParticipantId },
            data: {
                ...payload,
                paymentStatus: isApproving ? isParticipantExist.paymentStatus : PaymentStatus.REJECTED,
                ...(isApproving && { checkInToken: generateCheckInToken() })
            }
        });

        const payment = await tx.payment.findFirst({ where: { participantId: eventParticipantId } });
        if (payment) {
            await tx.payment.update({ where: { id: payment.id }, data: { paymentStatus: PaymentStatus.REJECTED } });
        }

        let promoted = {};
        if (prevJoinStatus === JoinStatus.APPROVED) {
            promoted = await autoApproveNextWaitlisted(isParticipantExist.eventId, tx);
        }

        return {
            participant: updated,
            notifyTarget: { userId: isParticipantExist.userId, eventTitle: participantEvent.title },
            promoted
        };
    });

    // Fire notifications outside the transaction (non-blocking)
    if (notifyTarget) {
        notify({ userId: notifyTarget.userId, type: NotificationType.PARTICIPANT_REJECTED, title: "Request not approved", message: `Your request for "${notifyTarget.eventTitle}" was not approved.`, emailHtml: buildRejectionEmail(notifyTarget.eventTitle) });
    }
    const { promotedUserId, eventTitle } = promoted as { promotedUserId?: string; eventTitle?: string };
    if (promotedUserId && eventTitle) {
        notify({ userId: promotedUserId, type: NotificationType.WAITLIST_PROMOTED, title: "Spot opened up!", message: `You've been approved from the waitlist for "${eventTitle}".`, emailHtml: buildWaitlistPromotedEmail(eventTitle) });
    }

    return participant;
};

const deleteEventParticipantById = async (id: string, decodedToken: JwtPayload) => {
    const isParticipantExist = await prisma.eventParticipant.findUnique({ where: { id } });

    if (!isParticipantExist) {
        throw new AppError(status.NOT_FOUND, "Event participant not found");
    }

    const hostInfo = await getEventHost(decodedToken.userId, isParticipantExist.eventId);
    if (!hostInfo) {
        throw new AppError(status.FORBIDDEN, "You are not allowed to delete this event participant");
    }

    const participant = await prisma.eventParticipant.delete({
        where: { id },
    });

    return participant;
};

export const eventParticipantService = {
    createEventParticipant,
    getAllEventParticipants,
    getEventParticipantById,
    updateEventParticipantById,
    deleteEventParticipantById
};
