import { Router } from "express";
import { PaymentController } from "./payment.controller";

const router: Router = Router()

router.post("/init-payment/:participantId", PaymentController.initPayment)
router.post("/success", PaymentController.successPayment)
router.post("/fail", PaymentController.failPayment)
router.post("/cancel", PaymentController.cancelPayment)
router.post("/validate-payment", PaymentController.validatePayment)

export const PaymentRoutes = router;