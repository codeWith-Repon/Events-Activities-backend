import { Router } from "express";
import { UserRoutes } from "../modules/user/user.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { EventsRoutes } from "../modules/events/events.route";


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
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})