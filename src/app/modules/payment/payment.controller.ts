import { Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { envVars } from "../../config/env"
import { PaymentService } from "./payment.service"

const successPayment = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string>
    const result = await PaymentService.successPayment(query)

    if (result.success) {
        res.redirect(`${envVars.SSL.SSL_SUCCESS_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}`)
    }
})

const failPayment = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string>
    const result = await PaymentService.failPayment(query)

    if (!result.success) {
        res.redirect(`${envVars.SSL.SSL_FAIL_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}`)
    }
})

const cancelPayment = catchAsync(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string>
    const result = await PaymentService.failPayment(query)

    if (!result.success) {
        res.redirect(`${envVars.SSL.SSL_CANCEL_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}`)
    }
})


export const PaymentController = {
    successPayment,
    failPayment,
    cancelPayment
}