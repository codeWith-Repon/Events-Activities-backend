import { JwtPayload } from "jsonwebtoken"
import { prisma } from "../../../lib/prisma";
import { Event, JoinStatus, Prisma, User, UserRole } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { generateSlug } from "../../utils/generateSlug";
import { deleteImageFromCloudinary } from "../../config/cloudinary.config";
import { TUpdateEvent } from "./events.interface";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";
import { eventSearchableFields } from "./events.constant";

const createEvent = async (payload: Event, decodedToken: JwtPayload) => {

    const { userId } = decodedToken

    return await prisma.$transaction(async (tx) => {
        // 1. find the user

        const isUserExist: User | null = await tx.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!isUserExist) {
            throw new AppError(status.BAD_REQUEST, "User not found")
        }
        // 2. update isHost = true in user table

        if (!isUserExist.isHost) {
            await tx.user.update({
                where: { id: userId },
                data: { isHost: true }
            })
        }
        // 3. convert USER -> HOST
        // Admin / super admin role not touch 
        if (isUserExist.role === UserRole.USER) {
            await tx.user.update({
                where: { id: userId },
                data: { role: UserRole.HOST }
            })
        }

        // 4. ensure host table entry exists
        let host = await tx.host.findUnique(
            {
                where: {
                    userId
                }
            }
        )

        if (!host) {
            host = await tx.host.create({
                data: {
                    userId,
                    rating: 0,
                    totalEventsHosted: 0
                }
            })
        }

        // 5. generate unique slug 
        const slug = await generateSlug(payload.title, tx.event)

        payload.slug = slug
        payload.date = new Date(payload.date)
        payload.minParticipants = Number(payload.minParticipants) || 1;
        payload.maxParticipants = Number(payload.maxParticipants) || 1;
        payload.fee = Number(payload.fee) || 0;

        // 6. create event
        const event = await tx.event.create({
            data: {
                ...payload,
                hostId: host.id
            }
        })

        return event
    })
}

const getAllEvents = async (filters: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = PaginationHelpers.calculatePagination(options)
    const { searchTerm, ...filterData } = filters

    const andConditions: Prisma.EventWhereInput[] = []

    if (searchTerm) {
        andConditions.push({
            OR: eventSearchableFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        })
    }

    if (Object.keys(filterData).length > 0) {
        const filterConditions = Object.keys(filterData).map((key) => {
            return {
                [key]: {
                    equals: filterData[key]
                }
            }
        })
        andConditions.push({
            AND: filterConditions
        })
    }

    const whereConditions: Prisma.EventWhereInput = andConditions.length > 0 ? { AND: andConditions } : {}

    const events = await prisma.event.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
            [sortBy]: sortOrder
        },
        include: {
            host: {
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true,
                            profileImage: true,
                            gender: true
                        }
                    }
                }
            }
        }
    })

    const total = await prisma.event.count({
        where: whereConditions
    })

    const totalPage = Math.ceil(total / limit)

    return {
        meta: {
            page,
            limit,
            totalPage,
            total
        },
        data: events
    }
}

const getEventBySlug = async (slug: string) => {
    const event = await prisma.event.findUnique({
        where: {
            slug
        },
        include: {
            host: {
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true,
                            profileImage: true,
                            gender: true
                        }
                    }
                }
            }
        }
    })

    return event
}

const updateEvent = async (
    payload: TUpdateEvent,
    slug: string,
    decodedToken: JwtPayload
) => {
    // console.log(payload)
    const { userId } = decodedToken

    const existingEvent = await prisma.event.findUnique({
        where: {
            slug
        }
    })

    if (!existingEvent) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    const host = await prisma.host.findUnique({
        where: {
            userId
        }
    })

    if (!host || existingEvent.hostId !== host.id) {
        throw new AppError(status.FORBIDDEN, "You are not allowed to update this event");
    }

    let updatedImages = existingEvent.images || [];

    // Add new images
    if (payload.images && payload.images.length > 0) {
        updatedImages = [...updatedImages, ...payload.images];
    }


    // Remove deleted images
    if (payload.deleteImages && payload.deleteImages.length > 0 && existingEvent.images && existingEvent.images.length > 0) {
        updatedImages = updatedImages.filter(img => !payload.deleteImages!.includes(img));

        // Delete from Cloudinary asynchronously
        await Promise.all(payload.deleteImages.map(url => deleteImageFromCloudinary(url)));
    }

    if (payload.title) {
        const slug = await generateSlug(payload.title, prisma.event)
        payload.slug = slug
    }

    const prismaPayload = {
        title: payload.title || existingEvent.title,
        slug: payload.slug || existingEvent.slug,
        category: payload.category || existingEvent.category,
        description: payload.description || existingEvent.description,
        date: payload.date || existingEvent.date,
        time: payload.time || existingEvent.time,
        location: payload.location || existingEvent.location,
        minParticipants: payload.minParticipants || existingEvent.minParticipants,
        maxParticipants: payload.maxParticipants || existingEvent.maxParticipants,
        fee: payload.fee || existingEvent.fee,
        status: payload.status || existingEvent.status,
        images: updatedImages || existingEvent.images,
    };


    const updatedEvent = await prisma.event.update({
        where: {
            slug
        },
        data: prismaPayload
    })


    return updatedEvent
}

const deleteEvent = async (slug: string, decodedToken: JwtPayload) => {
    const { userId } = decodedToken

    const host = await prisma.host.findUnique({
        where: {
            userId
        }
    })

    if (!host) {
        throw new AppError(status.FORBIDDEN, "You are not allowed to delete this event");
    }

    const event = await prisma.event.findUnique({
        where: {
            slug
        }
    })

    if (!event) {
        throw new AppError(status.NOT_FOUND, "Event not found");
    }

    if (event.hostId !== host.id) {
        throw new AppError(status.FORBIDDEN, "You are not allowed to delete this event");
    }
    await prisma.event.delete({
        where: {
            slug
        }
    })
}


const getAllEventsCategory = async () => {
    const events = await prisma.event.findMany({
        distinct: ["category"],
        select: {
            category: true
        }
    })

    return events.map(e => e.category)
}

export const EventsService = {
    createEvent,
    getAllEvents,
    getEventBySlug,
    updateEvent,
    deleteEvent,
    getAllEventsCategory
}