import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,              
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
});


const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
    adapter,
    log: ["error", "warn"],
});