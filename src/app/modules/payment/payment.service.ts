import { JoinStatus, PaymentStatus } from "../../../generated/prisma/enums"
import { prisma } from "../../../lib/prisma"


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
    successPayment,
    failPayment,
    cancelPayment
}