import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { ICreateRating, IUpdateRating } from "./rating.interface";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";
import { ratingSearchableFields, ratingFilterableFields } from "./rating.constants";
import { Prisma, EventStatus } from "../../../generated/prisma/client";

// Create a new rating
const createRating = async (
  payload: ICreateRating,
  decodedToken: JwtPayload
) => {
  const userId = decodedToken.userId as string;

  return await prisma.$transaction(async (tx) => {
    // 1. Find the event participant
    const participant = await tx.eventParticipant.findUnique({
      where: { id: payload.participantId },
      include: { event: true, user: true }
    });

    if (!participant) {
      throw new AppError(status.NOT_FOUND, "Participant record not found");
    }

    // 2. Verify the user is the participant
    if (participant.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only rate events you participated in"
      );
    }

    // 3. Check event is COMPLETED
    if (participant.event.status !== EventStatus.COMPLETED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Event must be completed before rating. Current status: ${participant.event.status}`
      );
    }

    // 4. Check user is not the host
    const host = await tx.host.findUnique({
      where: { id: participant.event.hostId }
    });

    if (host && host.userId === userId) {
      throw new AppError(
        status.BAD_REQUEST,
        "You cannot rate your own event"
      );
    }

    // 5. Check for existing rating (unique constraint)
    const existingRating = await tx.rating.findUnique({
      where: {
        eventId_userId: {
          eventId: participant.eventId,
          userId
        }
      }
    });

    if (existingRating) {
      throw new AppError(
        status.CONFLICT,
        "You already rated this event. Use PATCH to update your rating."
      );
    }

    // 6. Create rating
    const rating = await tx.rating.create({
      data: {
        participantId: payload.participantId,
        eventId: participant.eventId,
        userId,
        rating: payload.rating,
        review: payload.review || null
      },
      include: {
        rater: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    // 7. Update Host rating (average of all their event ratings)
    await calculateAndUpdateHostRating(participant.event.hostId, tx);

    return rating;
  });
};

// Update an existing rating
const updateRating = async (
  ratingId: string,
  payload: IUpdateRating,
  decodedToken: JwtPayload
) => {
  const userId = decodedToken.userId as string;

  return await prisma.$transaction(async (tx) => {
    // 1. Find rating
    const rating = await tx.rating.findUnique({
      where: { id: ratingId },
      include: { event: true }
    });

    if (!rating) {
      throw new AppError(status.NOT_FOUND, "Rating not found");
    }

    // 2. Check authorization
    if (rating.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only update your own ratings"
      );
    }

    // 3. Update rating
    const updatedRating = await tx.rating.update({
      where: { id: ratingId },
      data: {
        rating: payload.rating ?? rating.rating,
        review: payload.review !== undefined ? payload.review || null : rating.review
      },
      include: {
        rater: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    });

    // 4. Recalculate host rating if rating value changed
    if (payload.rating !== undefined && payload.rating !== rating.rating) {
      await calculateAndUpdateHostRating(rating.event.hostId, tx);
    }

    return updatedRating;
  });
};

// Delete a rating
const deleteRating = async (ratingId: string, decodedToken: JwtPayload) => {
  const userId = decodedToken.userId as string;

  return await prisma.$transaction(async (tx) => {
    // 1. Find rating
    const rating = await tx.rating.findUnique({
      where: { id: ratingId },
      include: { event: true }
    });

    if (!rating) {
      throw new AppError(status.NOT_FOUND, "Rating not found");
    }

    // 2. Check authorization
    if (rating.userId !== userId) {
      throw new AppError(
        status.FORBIDDEN,
        "You can only delete your own ratings"
      );
    }

    // 3. Delete rating
    const deletedRating = await tx.rating.delete({
      where: { id: ratingId }
    });

    // 4. Recalculate host rating
    await calculateAndUpdateHostRating(rating.event.hostId, tx);

    return deletedRating;
  });
};

// Get a single rating by ID
const getRatingById = async (ratingId: string) => {
  const rating = await prisma.rating.findUnique({
    where: { id: ratingId },
    include: {
      rater: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  });

  if (!rating) {
    throw new AppError(status.NOT_FOUND, "Rating not found");
  }

  return rating;
};

// List all ratings for an event
const listEventRatings = async (
  eventId: string,
  filters: any,
  options: IOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    PaginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.RatingWhereInput[] = [
    { eventId: { equals: eventId } }
  ];

  // Search in review and rater name
  if (searchTerm) {
    andConditions.push({
      OR: ratingSearchableFields.map((field) => {
        const parts = field.split(".");
        if (parts.length === 2) {
          const [relation, relField] = parts;
          return {
            [relation as string]: {
              [relField as string]: {
                contains: searchTerm,
                mode: "insensitive"
              }
            }
          };
        }
        return {
          [field]: {
            contains: searchTerm,
            mode: "insensitive"
          }
        };
      })
    });
  }

  // Filter by rating value
  if (filterData.rating) {
    andConditions.push({
      rating: { equals: parseInt(filterData.rating) }
    });
  }

  const whereConditions: Prisma.RatingWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const ratings = await prisma.rating.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy as string]: sortOrder },
    include: {
      rater: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  });

  const total = await prisma.rating.count({ where: whereConditions });
  const totalPage = Math.ceil(total / limit);

  // Calculate average rating for this event
  const avgResult = await prisma.rating.aggregate({
    where: { eventId },
    _avg: { rating: true },
    _count: true
  });

  const avgRating =
    avgResult._avg.rating !== null ? parseFloat(avgResult._avg.rating.toFixed(2)) : 0;

  return {
    meta: { page, limit, totalPage, total, avgRating },
    data: ratings
  };
};

// List all ratings submitted by a user
const listUserRatings = async (
  userId: string,
  filters: any,
  options: IOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    PaginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.RatingWhereInput[] = [
    { userId: { equals: userId } }
  ];

  if (searchTerm) {
    andConditions.push({
      OR: ratingSearchableFields.map((field) => {
        const parts = field.split(".");
        if (parts.length === 2) {
          const [relation, relField] = parts;
          return {
            [relation as string]: {
              [relField as string]: {
                contains: searchTerm,
                mode: "insensitive"
              }
            }
          };
        }
        return {
          [field]: {
            contains: searchTerm,
            mode: "insensitive"
          }
        };
      })
    });
  }

  const whereConditions: Prisma.RatingWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const ratings = await prisma.rating.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { [sortBy as string]: sortOrder },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          host: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  const total = await prisma.rating.count({ where: whereConditions });
  const totalPage = Math.ceil(total / limit);

  return {
    meta: { page, limit, totalPage, total },
    data: ratings
  };
};

// Helper function: Calculate and update host average rating
const calculateAndUpdateHostRating = async (
  hostId: string,
  tx?: any
) => {
  const prismaClient = tx || prisma;

  // Get all ratings for events by this host (only completed events)
  const result = await prismaClient.rating.aggregate({
    where: {
      event: {
        hostId: hostId,
        status: EventStatus.COMPLETED
      }
    },
    _avg: { rating: true },
    _count: true
  });

  const avgRating =
    result._avg.rating !== null
      ? parseFloat(result._avg.rating.toFixed(2))
      : 0;

  // Update host rating
  const updatedHost = await prismaClient.host.update({
    where: { id: hostId },
    data: { rating: avgRating }
  });

  return updatedHost;
};

export const ratingService = {
  createRating,
  updateRating,
  deleteRating,
  getRatingById,
  listEventRatings,
  listUserRatings
};
