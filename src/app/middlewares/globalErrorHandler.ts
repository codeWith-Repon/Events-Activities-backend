import { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env";
import { ZodError } from "zod";
import AppError from "../errorHelpers/AppError";

export interface TErrorSources {
    path: string,
    message: string
}

export interface TGenericErrorResponse {
    statusCode: number,
    message: string,
    errorSources?: TErrorSources[];
}

export const globalErrorHandler = async (err: any, req: Request, res: Response, next: NextFunction) => {

    let statusCode = 500
    let message = "Something went wrong!"
    let errorSources: TErrorSources[] = []

    if (envVars.NODE_ENV === "development") {
        console.error("🔥 Global Error:", err);
    }

    // ================================
    // 1. Zod Validation Error Handler
    // ================================
    if (err instanceof ZodError) {
        statusCode = 400
        message = "Validation Error!"
        err.issues.forEach(issue => {
            errorSources.push({
                path: issue.path[issue.path.length - 1] as string,
                message: issue.message
            })
        })
    }

    // ================================
    // 2. AppError Handler (Custom)
    // ==============================


    else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errorSources = [
            {
                path: "",
                message: err.message
            }
        ]
    }
    // ================================
    // 3. Prisma Error Handler
    // ================================
    else if (err.code === "P2002") {
        statusCode = 400;
        message = "Duplicate value!";

        const fields =
            err.meta?.driverAdapterError?.cause?.constraint?.fields || [];

        errorSources = fields.map((field: string) => ({
            path: fields,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} must be unique!`
        }))
    }

    else if (err.code === "P2025") {
        statusCode = 404;
        message = "Record not found!!!"
        errorSources = [
            {
                path: err.meta.modelName,
                message: "Record not found!"
            }
        ]
    }
    // ================================
    // 4. Generic Error (fallback)
    // ================================
    else if (err instanceof Error) {
        statusCode = 500
        message = err.message;
    }


    res.status(statusCode).json({
        success: false,
        message,
        error: errorSources,
        stack: envVars.NODE_ENV === "development" ? err.stack : null
    })
}