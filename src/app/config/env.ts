import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
    PORT: string,
    DATABASE_URL: string,
    NODE_ENV: "development" | "production",
    BCRYPT_SALT_ROUND: string,
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
        BCRYPT_SALT_ROUND: process.env.BCRYPT_SALT_ROUND!,
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
    }
}

export const envVars: EnvConfig = loadEnvVariable();