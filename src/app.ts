import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import { router } from './app/routes';
import cookieParser from 'cookie-parser'
import morgan from "morgan";
import { envVars } from './app/config/env';

const app: Application = express();


app.use(cors({
    origin: [envVars.FRONTEND_URL, envVars.FRONTEND_LIVE_URL].filter(Boolean),
    credentials: true
}))

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("dev"));
app.use("/api/v1", router)

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is running...",
        environment: process.env.NODE_ENV,
        uptime: process.uptime().toFixed(2) + " sec",
        timeStamp: new Date().toISOString()
    })
})

app.use(globalErrorHandler)
app.use(notFound)

export default app