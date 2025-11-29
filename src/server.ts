import { Server } from 'http'
import app from './app'
import { prisma } from './lib/prisma';


let server: Server;
const PORT = process.env.PORT || 5000
const startServer = async () => {
    try {
        console.log("⏳ Connecting to database...");

        await prisma.$connect();

        console.log("🟢 Database connected successfully!");

        server = app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Database connection failed!");
        console.error("Error details:", error);

        process.exit(1);
    }
};

startServer()

// Unhandled Promise Rejection
process.on("unhandledRejection", (error) => {
    console.error("💥 Unhandled Rejection detected!");
    console.error(error);

    if (server) {
        server.close(() => process.exit(1));
    } else {
        process.exit(1);
    }
});

// Uncaught Exception
process.on("uncaughtException", (error) => {
    console.error("💥 Uncaught Exception detected!");
    console.error(error);

    if (server) {
        server.close(() => process.exit(1));
    } else {
        process.exit(1);
    }
});

// SIGTERM (cloud providers use this)
process.on("SIGTERM", () => {
    console.log("📴 SIGTERM received. Shutting down gracefully...");
    if (server) server.close(() => process.exit(0));
});

// Ctrl + C
process.on("SIGINT", () => {
    console.log("📴 SIGINT received. Server shutting down...");
    if (server) server.close(() => process.exit(0));
});