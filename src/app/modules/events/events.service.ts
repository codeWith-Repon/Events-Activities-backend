import { JwtPayload } from "jsonwebtoken"
import { prisma } from "../../../lib/prisma";
import { Event, EventStatus, JoinStatus, NotificationType, Prisma, User, UserRole } from "../../../generated/prisma/client";
import { notify } from "../notification/notification.service";
import { buildEventCancelledEmail } from "../../utils/emailTemplates";
import { getEventHost } from "../../utils/isEventHost";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { generateSlug } from "../../utils/generateSlug";
import { deleteImageFromCloudinary } from "../../config/cloudinary.config";
import { TUpdateEvent } from "./events.interface";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";
import { eventSearchableFields } from "./events.constant";

const createEvent = async (payload: Event, decodedToken: JwtPayload) => {

    const { userId } = decodedToken

    const user: User | null = await prisma.user.findUnique({
        where: {
            id: userId
        }
    })

    if (!user) {
        throw new AppError(status.BAD_REQUEST, "User not found")
    }

    const slug = await generateSlug(payload.title, prisma.event)

    return await prisma.$transaction(async (tx) => {

        // convert USER -> HOST role (admin/super_admin roles not changed)
        if (user.role === UserRole.USER) {
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
        where: { slug },
        include: {
            host: {
                include: {
                    user: { select: { name: true, email: true, role: true, profileImage: true, gender: true } }
                }
            }
        }
    });

    if (event) {
        prisma.event.update({ where: { id: event.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    }

    return event;
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

    const hostInfo = await getEventHost(userId, existingEvent.id);
    if (!hostInfo) {
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
        where: { slug },
        data: prismaPayload
    });

    // Notify all approved participants when event is cancelled
    if (payload.status === EventStatus.CANCELLED) {
        const participants = await prisma.eventParticipant.findMany({
            where: { eventId: updatedEvent.id, joinStatus: JoinStatus.APPROVED },
            select: { userId: true }
        });
        participants.forEach(({ userId }) => {
            notify({ userId, type: NotificationType.EVENT_CANCELLED, title: "Event cancelled", message: `"${updatedEvent.title}" has been cancelled by the host.`, emailHtml: buildEventCancelledEmail(updatedEvent.title) });
        });
    }

    return updatedEvent;
}

const deleteEvent = async (slug: string, decodedToken: JwtPayload) => {
    const { userId } = decodedToken

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) throw new AppError(status.NOT_FOUND, "Event not found");

    // Only primary host can delete
    const hostInfo = await getEventHost(userId, event.id);
    if (!hostInfo?.isPrimary) {
        throw new AppError(status.FORBIDDEN, "Only the primary host can delete an event");
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

const getEventAnalytics = async (slug: string, decodedToken: JwtPayload) => {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) throw new AppError(status.NOT_FOUND, "Event not found");

    const hostInfo = await getEventHost(decodedToken.userId, event.id);
    if (!hostInfo) throw new AppError(status.FORBIDDEN, "Only hosts can view analytics");

    const [participantGroups, checkedInCount, paymentGroups] = await Promise.all([
        prisma.eventParticipant.groupBy({
            by: ["joinStatus"],
            where: { eventId: event.id },
            _count: { id: true }
        }),
        prisma.eventParticipant.count({
            where: { eventId: event.id, joinStatus: JoinStatus.APPROVED, checkedIn: true }
        }),
        prisma.payment.groupBy({
            by: ["paymentStatus"],
            where: { eventId: event.id },
            _sum: { amount: true }
        })
    ]);

    const byStatus = Object.fromEntries(
        participantGroups.map(g => [g.joinStatus.toLowerCase(), g._count.id])
    );

    const approved = byStatus["approved"] ?? 0;
    const fillRate = event.maxParticipants > 0 ? parseFloat((approved / event.maxParticipants).toFixed(2)) : 0;

    const revenueByStatus = Object.fromEntries(
        paymentGroups.map(g => [g.paymentStatus.toLowerCase(), g._sum.amount ?? 0])
    );

    return {
        views: event.viewCount,
        participants: {
            total: participantGroups.reduce((sum, g) => sum + g._count.id, 0),
            approved,
            pending: byStatus["pending"] ?? 0,
            rejected: byStatus["rejected"] ?? 0,
            cancelled: byStatus["cancelled"] ?? 0,
            waitlisted: byStatus["waitlisted"] ?? 0
        },
        capacity: {
            max: event.maxParticipants,
            filled: approved,
            fillRate
        },
        revenue: {
            collected: revenueByStatus["paid"] ?? 0,
            pending: revenueByStatus["pending"] ?? 0,
            refunded: revenueByStatus["refunded"] ?? 0
        },
        checkin: {
            checkedIn: checkedInCount,
            absent: approved - checkedInCount,
            attendanceRate: approved > 0 ? parseFloat((checkedInCount / approved).toFixed(2)) : 0
        }
    };
};

const adminCancelEvent = async (eventId: string) => {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
    if (event.status === EventStatus.CANCELLED) throw new AppError(status.BAD_REQUEST, "Event is already cancelled");

    await prisma.event.update({ where: { id: eventId }, data: { status: EventStatus.CANCELLED } });

    // Notify all approved participants
    const participants = await prisma.eventParticipant.findMany({
        where: { eventId, joinStatus: JoinStatus.APPROVED },
        select: { userId: true }
    });

    participants.forEach(({ userId }) => {
        notify({ userId, type: NotificationType.EVENT_CANCELLED, title: "Event cancelled", message: `"${event.title}" has been cancelled by the platform.`, emailHtml: buildEventCancelledEmail(event.title) });
    });
};

export const EventsService = {
    createEvent,
    getAllEvents,
    getEventBySlug,
    updateEvent,
    deleteEvent,
    getAllEventsCategory,
    getEventAnalytics,
    adminCancelEvent
}