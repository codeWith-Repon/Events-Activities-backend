import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router: Router = Router()

router.post("/init-payment/:participantId", PaymentController.initPayment)
router.post("/success", PaymentController.successPayment)
router.post("/fail", PaymentController.failPayment)
router.post("/cancel", PaymentController.cancelPayment)
router.post("/validate-payment", PaymentController.validatePayment)

router.get(
    "/",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    PaymentController.getAllPayments
)

router.patch(
    "/:paymentId/refund",
    checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
    PaymentController.adminRefund
)

export const PaymentRoutes = router;