import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
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
    console.log(searchTerm)
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
            event: { select: { title: true, date: true, location: true, fee: true, category: true, status: true } },
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

export const eventParticipantService = {
    createEventParticipant,
    getAllEventParticipants
};
