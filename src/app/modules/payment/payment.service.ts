import status from "http-status"
import { EventStatus, JoinStatus, PaymentStatus } from "../../../generated/prisma/enums"
import { prisma } from "../../../lib/prisma"
import AppError from "../../errorHelpers/AppError"
import { generateTransactionId } from "../../utils/generateTransactionId"
import { SSLService } from "../sslCommerz/sslCommerz.service"
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface"

const paymentInit = async (participantId: string) => {
    const transactionId = generateTransactionId();

    const participant = await prisma.eventParticipant.findUnique({
        where: { id: participantId },
        include: { user: true, event: true }
    });

    if (!participant) throw new AppError(status.NOT_FOUND, "Participant not found");

    if (participant.paymentStatus === PaymentStatus.PAID) {
        throw new AppError(status.BAD_REQUEST, "User already paid!");
    }

    // Payment create/update in transaction
    await prisma.$transaction(async (tx) => {
        let existing = await tx.payment.findFirst({
            where: {
                participantId,
                paymentStatus: { not: PaymentStatus.PAID }
            }
        });

        if (existing) {
            await tx.payment.update({
                where: { id: existing.id },
                data: { transactionId, paymentStatus: PaymentStatus.PENDING }
            });
        } else {
            await tx.payment.create({
                data: {
                    userId: participant.userId,
                    eventId: participant.eventId,
                    participantId,
                    amount: participant.event.fee,
                    transactionId,
                    paymentStatus: PaymentStatus.PENDING
                }
            });
        }
    }, {
        maxWait: 5000,
        timeout: 15000
    });

    const sslPayload: ISSLCommerz = {
        amount: participant.event.fee,
        transactionId,
        name: participant.user.name,
        email: participant.user.email,
        phoneNumber: participant.user.contactNumber ?? "N/A",
        address: participant.user.address ?? "N/A",
    };

    const sslPayment = await SSLService.sslPaymentInit(sslPayload);

    if (!sslPayment?.GatewayPageURL) {
        throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to initialize SSLCommerz gateway");
    }

    return {
        paymentUrl: sslPayment.GatewayPageURL,
    };
};


const successPayment = async (query: Record<string, string>) => {
    return await prisma.$transaction(async (tx) => {
        // 1. update payment status
        const updatedPayment = await tx.payment.update({
            where: { transactionId: query.transactionId },
            data: { paymentStatus: PaymentStatus.PAID }
        })

        // 2. update booking status
        await tx.eventParticipant.update({
            where: {
                eventId_userId: {
                    eventId: updatedPayment.eventId,
                    userId: updatedPayment.userId
                }
            },
            data: {
                joinStatus: JoinStatus.APPROVED,
                paymentStatus: PaymentStatus.PAID,
                updatedAt: new Date(),
            }
        })

        // Mark event FULL if approved participants reached max
        const approvedCount = await tx.eventParticipant.count({
            where: { eventId: updatedPayment.eventId, joinStatus: JoinStatus.APPROVED }
        });
        const event = await tx.event.findUnique({
            where: { id: updatedPayment.eventId },
            select: { maxParticipants: true }
        });
        if (event && approvedCount >= event.maxParticipants) {
            await tx.event.update({
                where: { id: updatedPayment.eventId },
                data: { status: EventStatus.FULL }
            });
        }

        return {
            success: true,
            message: "Payment completed successfully!",
            updatedPayment,
        };
    }, {
        maxWait: 10000,
        timeout: 20000
    })
}

const failPayment = async (query: Record<string, string>) => {
    return await prisma.$transaction(async (tx) => {
        // 1. update payment status
        const updatedPayment = await tx.payment.update({
            where: { transactionId: query.transactionId },
            data: { paymentStatus: PaymentStatus.FAILED }
        })

        // 2. update eventParticipant
        await tx.eventParticipant.update({
            where: {
                eventId_userId: {
                    eventId: updatedPayment.eventId,
                    userId: updatedPayment.userId
                }
            },
            data: {
                joinStatus: JoinStatus.CANCELLED,
                paymentStatus: PaymentStatus.FAILED,
                updatedAt: new Date(),
            }
        })

        return {
            success: false,
            message: "Payment failed! Booking update applied.",
            updatedPayment,
        };
    })
}

const cancelPayment = async (query: Record<string, string>) => {
    return await prisma.$transaction(async (tx) => {
        // 1. update payment status
        const updatedPayment = await tx.payment.update({
            where: { transactionId: query.transactionId },
            data: { paymentStatus: PaymentStatus.CANCELLED }
        });

        // 2. update participant
        await tx.eventParticipant.update({
            where: {
                eventId_userId: {
                    eventId: updatedPayment.eventId,
                    userId: updatedPayment.userId
                }
            },
            data: {
                joinStatus: JoinStatus.CANCELLED,
                paymentStatus: PaymentStatus.CANCELLED,
                updatedAt: new Date(),
            }
        });

        return {
            success: false,
            message: "Payment cancelled by user!",
            updatedPayment,
        };
    });
};

const getAllPayments = async (filters: any, options: any) => {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";

    const where: any = {};
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.userId) where.userId = filters.userId;

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                user: { select: { name: true, email: true } },
                event: { select: { title: true, slug: true } }
            }
        }),
        prisma.payment.count({ where })
    ]);

    return { meta: { page, limit, totalPage: Math.ceil(total / limit), total }, data: payments };
};

const adminRefund = async (paymentId: string) => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { participant: true }
    });
    if (!payment) throw new AppError(status.NOT_FOUND, "Payment not found");
    if (payment.paymentStatus !== PaymentStatus.PAID) {
        throw new AppError(status.BAD_REQUEST, "Only PAID payments can be refunded");
    }

    await prisma.$transaction([
        prisma.payment.update({ where: { id: paymentId }, data: { paymentStatus: PaymentStatus.REFUNDED } }),
        ...(payment.participantId ? [prisma.eventParticipant.update({
            where: { id: payment.participantId },
            data: { joinStatus: JoinStatus.CANCELLED, paymentStatus: PaymentStatus.REFUNDED }
        })] : [])
    ]);
};

export const PaymentService = {
    paymentInit,
    successPayment,
    failPayment,
    cancelPayment,
    getAllPayments,
    adminRefund
}