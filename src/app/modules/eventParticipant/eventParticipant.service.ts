import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { EventParticipant, EventStatus, Prisma } from "../../../generated/prisma/client";
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

    return await prisma.$transaction(async (tx) => {

        // Check event exists
        const existsEvent = await tx.event.findUnique({
            where: { id: payload.eventId }
        });
        if (!existsEvent) throw new AppError(status.NOT_FOUND, "Event not found");

        const blockedStatuses: EventStatus[] = [
            EventStatus.CANCELLED,
            EventStatus.FULL,
            EventStatus.COMPLETED
        ];

        if (blockedStatuses.includes(existsEvent.status as EventStatus)) {
            throw new AppError(status.BAD_REQUEST, `Event is ${existsEvent.status}`);
        }

        // check user isHost status
        const isUserExist = await tx.user.findUnique({
            where: {
                id: userId
            }
        })

        if (isUserExist?.isHost) {
            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    isHost: false
                }
            })
        }

        // Prevent duplicate participation
        const existsEventParticipant = await tx.eventParticipant.findUnique({
            where: {
                eventId_userId: { eventId: existsEvent.id, userId }
            }
        });

        if (existsEventParticipant)
            throw new AppError(status.BAD_REQUEST, "Already joined this event");

        // Check host exists
        const existsHost = await tx.host.findUnique({
            where: { id: existsEvent.hostId }
        });
        if (!existsHost)
            throw new AppError(status.BAD_REQUEST, "Host not available!");

        // find userId in host table and prevent owner to join
        const host = await tx.host.findUnique({
            where: { userId }
        })
        if (host?.id === existsHost.id) {
            throw new AppError(status.BAD_REQUEST, "You can't join your own event");
        }

        // Create event participant
        const eventParticipant = await tx.eventParticipant.create({
            data: {
                userId,
                eventId: payload.eventId,
                hostId: existsHost.id
            }
        });

        // Create payment safely
        await tx.payment.create({
            data: {
                userId,
                eventId: payload.eventId,
                amount: existsEvent.fee,
                transactionId: generateTransactionId(),
                paymentGatewayData: Prisma.skip,
                invoiceUrl: Prisma.skip
            }
        });

        return eventParticipant;
    });
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
            event: { select: { title: true, date: true, location: true, fee: true, category: true, status: true, totalParticipants: true } },
            host: { include: { user: { select: { name: true, email: true, profileImage: true } } } },
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

// const updateEventParticipantById = async (
//     id: string,
//     decodedToken: JwtPayload,
//     payload: Partial<EventParticipant>
// ) => {

//     const isParticipantExist = await prisma.eventParticipant.findUnique({
//         where: { id },
//     });

//     if (!isParticipantExist) {
//         throw new AppError(status.NOT_FOUND, "Event participant not found");
//     }

//     const participant = await prisma.eventParticipant.update({
//         where: { id },
//         data: payload,
//         include: {
//             user: { select: { name: true, email: true, profileImage: true, role: true } },
//             event: { select: { title: true, description: true, date: true, time: true, location: true, fee: true, images: true, minParticipants: true, maxParticipants: true, totalParticipants: true, category: true, status: true } },
//             host: { include: { user: { select: { name: true, email: true, profileImage: true } } } },
//         },
//     });

//     return participant;
// };

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
    // updateEventParticipantById,
    deleteEventParticipantById
};
