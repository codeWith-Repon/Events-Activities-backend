import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
    PORT: string,
    DATABASE_URL: string,
    NODE_ENV: "development" | "production",
    FRONTEND_URL: string,
    FRONTEND_LIVE_URL: string,
    SMTP: {
        HOST?: string,
        PORT?: string,
        USER?: string,
        PASS?: string,
        FROM?: string
    },
    BCRYPT_SALT_ROUND: string,
    /**
     * Minutes to add to UTC to get the wall clock that `Event.time` is written
     * in. Events carry no timezone of their own, so one app-wide offset is the
     * best we can do; defaults to +06:00 (Asia/Dhaka).
     */
    EVENT_TIME_OFFSET_MINUTES: number,
    SUPER_ADMIN_NAME: string,
    SUPER_ADMIN_EMAIL: string,
    SUPER_ADMIN_PASSWORD: string,
    CLOUDINARY: {
        CLOUDINARY_CLOUD_NAME: string,
        CLOUDINARY_API_KEY: string,
        CLOUDINARY_API_SECRET: string
    },
    JWT_ACCESS_SECRET: string,
    JWT_ACCESS_EXPIRES: string,
    JWT_REFRESH_SECRET: string,
    JWT_REFRESH_EXPIRES: string,
    SSL: {
        STORE_ID: string,
        STORE_PASS: string,
        SSL_PAYMENT_API: string,
        SSL_VALIDATION_API: string,
        SSL_SUCCESS_BACKEND_URL: string,
        SSL_FAIL_BACKEND_URL: string,
        SSL_CANCEL_BACKEND_URL: string,
        SSL_SUCCESS_FRONTEND_URL: string,
        SSL_FAIL_FRONTEND_URL: string,
        SSL_CANCEL_FRONTEND_URL: string,
        SSL_IPN_API: string
    }
}

/** UTC-14:00 … UTC+14:00 — the widest range any real zone uses. */
const MIN_OFFSET_MINUTES = -14 * 60
const MAX_OFFSET_MINUTES = 14 * 60
const DEFAULT_OFFSET_MINUTES = 360 // +06:00, Asia/Dhaka

/**
 * Optional, so a deployment that never sets it still boots. Anything we can't
 * use falls back to the default *loudly* — a silent wrong offset would shift
 * every event reminder by hours with nothing in the logs to explain it.
 *
 * Note the empty-string case: `Number("")` is 0, which is a perfectly valid
 * offset (UTC), so a blank `EVENT_TIME_OFFSET_MINUTES=` would otherwise be
 * indistinguishable from someone deliberately choosing UTC.
 */
const resolveEventTimeOffset = (): number => {
    const raw = process.env.EVENT_TIME_OFFSET_MINUTES?.trim()

    if (!raw) return DEFAULT_OFFSET_MINUTES

    const parsed = Number(raw)

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        console.warn(
            `⚠️  EVENT_TIME_OFFSET_MINUTES="${raw}" is not a whole number — using ${DEFAULT_OFFSET_MINUTES} (UTC+06:00).`
        )
        return DEFAULT_OFFSET_MINUTES
    }

    if (parsed < MIN_OFFSET_MINUTES || parsed > MAX_OFFSET_MINUTES) {
        console.warn(
            `⚠️  EVENT_TIME_OFFSET_MINUTES=${parsed} is outside ±14h — using ${DEFAULT_OFFSET_MINUTES} (UTC+06:00).`
        )
        return DEFAULT_OFFSET_MINUTES
    }

    return parsed
}

const loadEnvVariable = (): EnvConfig => {
    const requiredEnvVariables: string[] = [
        "PORT",
        "DATABASE_URL",
        "NODE_ENV",
        "BCRYPT_SALT_ROUND",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
        "JWT_ACCESS_SECRET",
        "JWT_ACCESS_EXPIRES",
        "JWT_REFRESH_SECRET",
        "JWT_REFRESH_EXPIRES",
        "SUPER_ADMIN_NAME",
        "SUPER_ADMIN_EMAIL",
        "SUPER_ADMIN_PASSWORD",
        "FRONTEND_URL",
        "FRONTEND_LIVE_URL",
        "SSL_STORE_ID",
        "SSL_STORE_PASS",
        "SSL_PAYMENT_API",
        "SSL_VALIDATION_API",
        "SSL_SUCCESS_BACKEND_URL",
        "SSL_FAIL_BACKEND_URL",
        "SSL_CANCEL_BACKEND_URL",
        "SSL_SUCCESS_FRONTEND_URL",
        "SSL_FAIL_FRONTEND_URL",
        "SSL_CANCEL_FRONTEND_URL",
        "SSL_IPN_API"
    ];
    requiredEnvVariables.forEach(key => {
        if (!process.env[key]) {
            throw new Error(`Missing environment variable: ${key}`);
        }
    })

    return {
        PORT: process.env.PORT!,
        DATABASE_URL: process.env.DATABASE_URL!,
        NODE_ENV: process.env.NODE_ENV as "development" | "production",
        FRONTEND_URL: process.env.FRONTEND_URL!,
        FRONTEND_LIVE_URL: process.env.FRONTEND_LIVE_URL!,
        SMTP: {
            HOST: process.env.SMTP_HOST,
            PORT: process.env.SMTP_PORT,
            USER: process.env.SMTP_USER,
            PASS: process.env.SMTP_PASS,
            FROM: process.env.SMTP_FROM
        },
        BCRYPT_SALT_ROUND: process.env.BCRYPT_SALT_ROUND!,
        EVENT_TIME_OFFSET_MINUTES: resolveEventTimeOffset(),
        SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME!,
        SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL!,
        SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD!,
        CLOUDINARY: {
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
        },
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
        JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES!,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
        JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES!,
        SSL: {
            STORE_ID: process.env.SSL_STORE_ID!,
            STORE_PASS: process.env.SSL_STORE_PASS!,
            SSL_PAYMENT_API: process.env.SSL_PAYMENT_API!,
            SSL_VALIDATION_API: process.env.SSL_VALIDATION_API!,
            SSL_SUCCESS_BACKEND_URL: process.env.SSL_SUCCESS_BACKEND_URL!,
            SSL_FAIL_BACKEND_URL: process.env.SSL_FAIL_BACKEND_URL!,
            SSL_CANCEL_BACKEND_URL: process.env.SSL_CANCEL_BACKEND_URL!,
            SSL_SUCCESS_FRONTEND_URL: process.env.SSL_SUCCESS_FRONTEND_URL!,
            SSL_FAIL_FRONTEND_URL: process.env.SSL_FAIL_FRONTEND_URL!,
            SSL_CANCEL_FRONTEND_URL: process.env.SSL_CANCEL_FRONTEND_URL!,
            SSL_IPN_API: process.env.SSL_IPN_API!
        }
    }
}

export const envVars: EnvConfig = loadEnvVariable();