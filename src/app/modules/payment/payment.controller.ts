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
        message: "Payment done successfully",
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


export const PaymentController: Record<string, any> = {
    successPayment,
    failPayment,
    cancelPayment,
    initPayment,
    validatePayment
}