import { Response } from "express"


export interface AuthToken {
    accessToken: string,
    refreshToken: string
}

export const setAuthCookie = (res: Response, tokenInfo: AuthToken) => {
    if (tokenInfo.accessToken) {
        res.cookie("accessToken", tokenInfo.accessToken, {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: "none",
        })
    }
    if (tokenInfo.refreshToken) {
        res.cookie("refreshToken", tokenInfo.refreshToken, {
            httpOnly: true,
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "none",
        })
    }
}