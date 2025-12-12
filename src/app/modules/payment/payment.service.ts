import status from "http-status"
import { JoinStatus, PaymentStatus } from "../../../generated/prisma/enums"
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
                userId: participant.userId,
                eventId: participant.eventId,
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
                    amount: participant.event.fee,
                    transactionId,
                    paymentStatus: PaymentStatus.PENDING
                }
            });
        }
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

        // 3. Increment total participants in event table
        await tx.event.update({
            where: { id: updatedPayment.eventId },
            data: {
                totalParticipants: { increment: 1 },
            },
        });

        return {
            success: true,
            message: "Payment completed successfully!",
            updatedPayment,
        };
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

export const PaymentService = {
    paymentInit,
    successPayment,
    failPayment,
    cancelPayment
}