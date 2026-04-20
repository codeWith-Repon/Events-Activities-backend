import { Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { envVars } from "../../config/env"
import { PaymentService } from "./payment.service"
import { sendResponse } from "../../utils/sendResponse"
import { SSLService } from "../sslCommerz/sslCommerz.service"


const initPayment = catchAsync(async (req: Request, res: Response) => {
    const { participantId } = req.params
    const result = await PaymentService.paymentInit(participantId as string)

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Payment init successfully",
        data: result,
    })
})

const successPayment = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string>
    const result = await PaymentService.successPayment(query)

    if (result.success) {
        res.redirect(`${envVars.SSL.SSL_SUCCESS_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}&event=${result.updatedPayment.eventId}`)
    }
})

const failPayment = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string>
    const result = await PaymentService.failPayment(query)

    if (!result.success) {
        res.redirect(`${envVars.SSL.SSL_FAIL_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}&event=${result.updatedPayment.eventId}`)
    }
})

const cancelPayment = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string>
    const result = await PaymentService.failPayment(query)

    if (!result.success) {
        res.redirect(`${envVars.SSL.SSL_CANCEL_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}&event=${result.updatedPayment.eventId}`)
    }
})

const validatePayment = catchAsync(async (req: Request, res: Response) => {
    console.log('sslcommerz ipn url body', req.body)
    await SSLService.validatePayment(req.body)

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Payment validated successfully",
        data: null,
    })
})


const getAllPayments = catchAsync(async (req: Request, res: Response) => {
    const filters = { paymentStatus: req.query.paymentStatus, eventId: req.query.eventId, userId: req.query.userId };
    const options = { page: req.query.page, limit: req.query.limit, sortBy: req.query.sortBy, sortOrder: req.query.sortOrder };
    const result = await PaymentService.getAllPayments(filters, options);
    sendResponse(res, { statusCode: 200, success: true, message: "Payments retrieved", data: result });
});

const adminRefund = catchAsync(async (req: Request, res: Response) => {
    await PaymentService.adminRefund(req.params.paymentId as string);
    sendResponse(res, { statusCode: 200, success: true, message: "Payment refunded", data: null });
});

export const PaymentController: Record<string, any> = {
    successPayment,
    failPayment,
    cancelPayment,
    initPayment,
    validatePayment,
    getAllPayments,
    adminRefund
}