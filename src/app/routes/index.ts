import { Router } from "express";
import { UserRoutes } from "../modules/user/user.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { EventsRoutes } from "../modules/events/events.route";
import { EventParticipantRoutes } from "../modules/eventParticipant/eventParticipant.route";
import { PaymentRoutes } from "../modules/payment/payment.route";


export const router: Router = Router()

const moduleRoutes = [
    {
        path: '/users',
        route: UserRoutes
    },
    {
        path: '/auth',
        route: AuthRoutes
    },
    {
        path: '/events',
        route: EventsRoutes
    },
    {
        path: '/event-participants',
        route: EventParticipantRoutes
    },
    {
        path: '/payment',
        route: PaymentRoutes
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})