import express, { Application, Request, Response } from 'express'
import cors from 'cors'

const app: Application = express();


app.use(cors())
app.use(express.json())


app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is running...",
        environment: process.env.NODE_ENV,
        uptime: process.uptime().toFixed(2) + " sec",
        timeStamp: new Date().toISOString()
    })
})


export default app