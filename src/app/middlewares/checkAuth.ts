import { NextFunction, Request, Response, Router } from "express";
import AppError from "../errorHelpers/AppError";
import { verifyToken } from "../utils/jwt";
import { envVars } from "../config/env";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { Status } from "../../generated/prisma/enums";
import status from "http-status";

export const checkAuth = (...authRoles: string[]) => async (req: Request, res: Response, next: NextFunction) => {

    try {
        const accessToken = req.cookies.accessToken || req.headers.authorization

        if (!accessToken) {
            throw new AppError(status.UNAUTHORIZED, "No Token Received")
        }

        const verifiedToken = verifyToken(accessToken, envVars.JWT_ACCESS_SECRET) as JwtPayload;

        const isUserExist = await prisma.user.findUniqueOrThrow({
            where: {
                id: verifiedToken.userId
            }
        })

        // if (!isUserExist.isVerified) {
        //     throw new AppError(status.BAD_REQUEST, "User is not verified")
        // }

        if (isUserExist.status === Status.INACTIVE || isUserExist.status === Status.BLOCKED) {
            throw new AppError(status.FORBIDDEN, `User is ${isUserExist.status}`)
        }

        if (isUserExist.isDeleted) {
            throw new AppError(status.BAD_REQUEST, "User is deleted")
        }


        if (!authRoles.includes(verifiedToken.role)) {
            throw new AppError(status.FORBIDDEN, "You are not permitted to view this route!!")
        }

        req.user = verifiedToken
        next()

    } catch (error) {
        next(error)
    }
}