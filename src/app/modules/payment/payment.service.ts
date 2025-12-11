import status from "http-status"
import { JoinStatus, PaymentStatus } from "../../../generated/prisma/enums"
import { prisma } from "../../../lib/prisma"
import AppError from "../../errorHelpers/AppError"
import { generateTransactionId } from "../../utils/generateTransactionId"
import { SSLService } from "../sslCommerz/sslCommerz.service"
import { ISSLCommerz } from "../sslCommerz/sslCommerz.interface"

const paymentInit = async (participantId: string) => {
    return await prisma.$transaction(async (tx) => {
        // 1. find the event participant
        const isParticipantExist = await tx.eventParticipant.findUnique({
            where: { id: participantId },
            include: {
                user: true,
                event: true
            }
        });

        if (!isParticipantExist) {
            throw new AppError(status.NOT_FOUND, "Participant not found");
        }

        if (isParticipantExist.paymentStatus === PaymentStatus.PAID) {
            throw new AppError(status.BAD_REQUEST, "User already paid for this event!");
        }

        const { user, event } = isParticipantExist;
        const transactionId = generateTransactionId();

        // 2. Check if a payment already exists (not PAID)
        let payment = await tx.payment.findFirst({
            where: {
                userId: user.id,
                eventId: event.id,
                paymentStatus: { not: PaymentStatus.PAID }
            }
        });

        if (payment) {
            payment = await tx.payment.update({
                where: { id: payment.id },
                data: { transactionId, paymentStatus: PaymentStatus.PENDING }
            })
        } else {
            payment = await tx.payment.create({
                data: {
                    userId: user.id,
                    eventId: event.id,
                    amount: event.fee,
                    transactionId,
                    paymentStatus: PaymentStatus.PENDING
                }
            });
        }

        const payload: ISSLCommerz = {
            amount: event.fee,
            transactionId,
            name: user.name,
            email: user.email,
            phoneNumber: user.contactNumber || "N/A",
            address: user.address || "N/A",
        }
        const sslPayment = await SSLService.sslPaymentInit(payload)

        return {
            paymentUrl: sslPayment.GatewayPageURL,
        }
    })
}

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