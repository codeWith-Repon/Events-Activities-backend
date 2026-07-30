import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { ReportStatus, ReportType } from "../../../generated/prisma/client";
import { IOptions, PaginationHelpers } from "../../helpers/paginatioHelper";

const createReport = async (payload: { type: ReportType; targetId: string; reason: string }, decodedToken: JwtPayload) => {
  const reporterId = decodedToken.userId as string;

  if (payload.type === ReportType.EVENT) {
    const event = await prisma.event.findUnique({ where: { id: payload.targetId } });
    if (!event) throw new AppError(status.NOT_FOUND, "Event not found");
  } else if (payload.type === ReportType.RATING) {
    const rating = await prisma.rating.findUnique({ where: { id: payload.targetId } });
    if (!rating) throw new AppError(status.NOT_FOUND, "Rating not found");
  }

  return prisma.report.create({
    data: { reporterId, type: payload.type, targetId: payload.targetId, reason: payload.reason }
  });
};

const getAllReports = async (filters: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = PaginationHelpers.calculatePagination(options);
  const where: any = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { reporter: { select: { name: true, email: true } } }
    }),
    prisma.report.count({ where })
  ]);

  return { meta: { page, limit, totalPage: Math.ceil(total / limit), total }, data: reports };
};

const resolveReport = async (reportId: string, payload: { status: ReportStatus; adminNote?: string }) => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError(status.NOT_FOUND, "Report not found");
  if (report.status !== ReportStatus.PENDING) throw new AppError(status.BAD_REQUEST, "Report is already resolved or dismissed");

  return prisma.report.update({
    where: { id: reportId },
    data: { status: payload.status, adminNote: payload.adminNote }
  });
};

export const reportService = { createReport, getAllReports, resolveReport };
