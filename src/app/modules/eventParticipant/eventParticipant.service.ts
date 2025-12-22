import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { EventParticipant, EventStatus, JoinStatus, PaymentStatus, Prisma } from "../../../generated/prisma/client";
import { generateTransactionId } from "../../utils/generateTransactionId";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";
import { eventParticipantSearchableFields } from "./eventParticipant.constants";

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
            EventStatus.FULL,
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


        // check user isHost status
        const user = await tx.user.findUnique({
            where: {
                id: userId
            }
        })
        const isFree = existsEvent.fee === 0

        if (user?.isHost) {
            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    isHost: false
                }
            })
        }

        // Create event participant
        const eventParticipant = await tx.eventParticipant.create({
            data: {
                userId,
                eventId: payload.eventId,
                hostId: existsEvent.hostId,
                joinStatus: isFree ? JoinStatus.APPROVED : JoinStatus.PENDING,
                paymentStatus: isFree ? PaymentStatus.PAID : PaymentStatus.PENDING
            }
        });

        // Update total participants

        if (isFree) {

            if (existsEvent.totalParticipants >= existsEvent.maxParticipants) {
                throw new AppError(status.BAD_REQUEST, "Event is already full");
            }

            const updatedEvent = await tx.event.update({
                where: {
                    id: existsEvent.id,
                },
                data: {
                    totalParticipants: {
                        increment: 1
                    }
                }
            })

            if (updatedEvent.totalParticipants === updatedEvent.maxParticipants) {
                await tx.event.update({
                    where: {
                        id: existsEvent.id,
                    },
                    data: {
                        status: EventStatus.FULL
                    }
                })
            }
        }

        // Create payment safely
        if (!isFree) await tx.payment.create({
            data: {
                userId,
                eventId: payload.eventId,
                amount: existsEvent.fee,
                transactionId: transactionId,
            }
        });
        return eventParticipant;
    });

    return result
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
                    title: true, slug: true, description: true, date: true, time: true, location: true, minParticipants: true, maxParticipants: true, images: true, fee: true, category: true, status: true, totalParticipants: true, hostId: true, host: {
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
            event: { select: { title: true, description: true, date: true, time: true, location: true, fee: true, images: true, minParticipants: true, maxParticipants: true, totalParticipants: true, category: true, status: true } },
            host: { include: { user: { select: { name: true, email: true, profileImage: true } } } },
        },
    });

    if (!participant) {
        throw new AppError(status.NOT_FOUND, "Event participant not found");
    }

    return participant;
};

const updateEventParticipantById = async (
    eventParticipantId: string,
    decodedToken: JwtPayload,
    payload: Partial<EventParticipant>
) => {
    return prisma.$transaction(async (tx) => {
        // 1. find the event participant
        const isParticipantExist = await prisma.eventParticipant.findUnique({
            where: { id: eventParticipantId },
        });

        if (!isParticipantExist) {
            throw new AppError(status.NOT_FOUND, "Participant not found");
        }

        // 2. user can cancel his own participant status
        const isUserExist = await tx.user.findUnique({
            where: {
                id: decodedToken.userId
            }
        })

        if (!isUserExist) {
            throw new AppError(status.NOT_FOUND, "User not found");
        }

        if (
            isUserExist.id === isParticipantExist.userId
            && payload.joinStatus === JoinStatus.CANCELLED
        ) {
            const updatedParticipant = await tx.eventParticipant.update({
                where: { id: eventParticipantId },
                data: {
                    ...payload,
                    paymentStatus: PaymentStatus.CANCELLED
                }
            })

            // Find the payment record for this participant and event
            const payment = await tx.payment.findFirst({
                where: {
                    userId: decodedToken.userId,
                    eventId: isParticipantExist.eventId
                }
            });

            if (!payment) {
                throw new AppError(status.NOT_FOUND, "Payment not found");
            }

            await tx.payment.update({
                where: {
                    id: payment.id
                },
                data: {
                    paymentStatus: PaymentStatus.CANCELLED
                }
            });

            return updatedParticipant
        }

        // 3. host can update participant status -> reject
        const isHostExist = await tx.host.findUnique({
            where: {
                userId: decodedToken.userId
            }
        })

        if (!isHostExist) {
            throw new AppError(status.FORBIDDEN, "You are not allowed to update this event participant");
        }

        if (isHostExist.id !== isParticipantExist.hostId) {
            throw new AppError(status.FORBIDDEN, "You are not allowed to update this event participant");
        }

        const updatedParticipantStatus = await tx.eventParticipant.update({
            where: { id: eventParticipantId },
            data: {
                ...payload,
                paymentStatus: PaymentStatus.REJECTED
            }
        })

        // Find the payment record for this participant and event
        const payment = await tx.payment.findFirst({
            where: {
                eventId: isParticipantExist.eventId,
                userId: decodedToken.userId
            }
        });

        if (payment) {
            await tx.payment.update({
                where: {
                    id: payment.id
                },
                data: {
                    paymentStatus: PaymentStatus.REJECTED
                }
            });
        }

        return updatedParticipantStatus
    })
};

const deleteEventParticipantById = async (id: string, decodedToken: JwtPayload) => {

    const isHostExist = await prisma.host.findUnique({
        where: {
            userId: decodedToken.userId
        }
    })

    if (!isHostExist) {
        throw new AppError(status.FORBIDDEN, "You are not allowed to delete this event participant");
    }

    const isParticipantExist = await prisma.eventParticipant.findUnique({
        where: { id },
    });

    if (!isParticipantExist) {
        throw new AppError(status.NOT_FOUND, "Event participant not found");
    }

    if (isHostExist.id !== isParticipantExist.hostId) {
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
