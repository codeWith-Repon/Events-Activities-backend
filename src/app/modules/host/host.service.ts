import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";
import { PaymentStatus } from "../../../generated/prisma/client";

const getAllHosts = async (options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = PaginationHelpers.calculatePagination(options);

  const [hosts, total] = await Promise.all([
    prisma.host.findMany({
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: { select: { name: true, email: true, profileImage: true, status: true, createdAt: true } },
        _count: { select: { events: true } }
      }
    }),
    prisma.host.count()
  ]);

  return { meta: { page, limit, totalPage: Math.ceil(total / limit), total }, data: hosts };
};

const getHostStats = async (hostId: string) => {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    include: { user: { select: { name: true, email: true, profileImage: true } } }
  });
  if (!host) throw new AppError(status.NOT_FOUND, "Host not found");

  const [eventCount, participantCount, revenueResult] = await Promise.all([
    prisma.event.count({ where: { hostId } }),
    prisma.eventParticipant.count({
      where: { event: { hostId }, joinStatus: "APPROVED" }
    }),
    prisma.payment.aggregate({
      where: { event: { hostId }, paymentStatus: PaymentStatus.PAID },
      _sum: { amount: true }
    })
  ]);

  return {
    host,
    stats: {
      totalEvents: eventCount,
      totalParticipants: participantCount,
      totalRevenue: revenueResult._sum.amount ?? 0,
      averageRating: host.rating
    }
  };
};

const setHostVerification = async (hostId: string, isVerified: boolean) => {
  const host = await prisma.host.findUnique({ where: { id: hostId } });
  if (!host) throw new AppError(status.NOT_FOUND, "Host not found");

  return prisma.host.update({ where: { id: hostId }, data: { isVerified } });
};

export const hostService = { getAllHosts, getHostStats, setHostVerification };
