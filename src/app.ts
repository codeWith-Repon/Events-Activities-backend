import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import { globalErrorHandler } from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import { router } from './app/routes';

const app: Application = express();


app.use(cors())
app.use(express.json())

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