import { endOfDay, subDays, startOfMonth } from "date-fns";
import { prisma } from "../../../lib/prisma";
import { PaymentStatus, UserRole } from "../../../generated/prisma/enums";

const getAdminDashboardMetaData = async (query: any) => {
    const { startDate, endDate, duration } = query;

    let dateFilter: any = {}
    const nowEndOfDay = endOfDay(new Date()); //(23:59:59)
    let filterDate: Date;

    // if (startDate && endDate) {
    //     dateFilter = {
    //         createdAt: {
    //             gte: new Date(startDate),  //Sun Dec 21 2025 00:00:00 
    //             lte: endOfDay(new Date(endDate)) //Sun Dec 21 2025 23:59:59
    //         }
    //     }
    // } else if (duration === "7days") {
    //     dateFilter = {
    //         createdAt: {
    //             gte: subDays(new Date(), 7),
    //             lte: nowEndOfDay
    //         }
    //     }
    // } else if (duration === "15days") {
    //     dateFilter = {
    //         createdAt: {
    //             gte: subDays(new Date(), 15),
    //             lte: nowEndOfDay
    //         }
    //     }
    // } else if (duration === "1month") {
    //     dateFilter = {
    //         createdAt: {
    //             gte: startOfMonth(new Date()),
    //             lte: nowEndOfDay
    //         }
    //     }
    // }

    if (startDate && endDate) {
        filterDate = new Date(startDate);

        dateFilter.createdAt = {
            gte: new Date(startDate),
            lte: endOfDay(new Date(endDate))
        }
    } else {

        if (duration === "7days") filterDate = subDays(new Date(), 7)
        else if (duration === "15days") filterDate = subDays(new Date(), 15)
        else filterDate = startOfMonth(new Date())


        dateFilter.createdAt = {
            gte: filterDate,
            lte: nowEndOfDay
        }
    }

    const [
        totalUsers,
        totalEvents,
        paymentStats,
        // recentPayments,
        eventStatusCount,
        revenueChartData,
        userChartData,
        eventChartData
    ] = await Promise.all([
        // total users
        prisma.user.count({ where: { role: UserRole.USER, isDeleted: false } }),

        // total events
        prisma.event.count({ where: dateFilter }),

        //payment stats
        prisma.payment.aggregate({
            where: { ...dateFilter, paymentStatus: PaymentStatus.PAID },
            _sum: { amount: true },
            _count: { id: true }
        }),

        //recent payments
        // prisma.payment.findMany({
        //     where: { ...dateFilter, paymentStatus: PaymentStatus.PAID },
        //     take: 5,
        //     orderBy: { createdAt: "desc" },
        //     include: {
        //         user: { select: { name: true } },
        //         event: { select: { title: true } }
        //     }
        // }),

        //eventStatusCount
        prisma.event.groupBy({
            by: ['status'],
            _count: { _all: true }
        }),

        // revenueChartData
        prisma.$queryRaw`
        SELECT 
            TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
            SUM("amount") AS total
        FROM payments
        WHERE "paymentStatus" = 'PAID'
            -- AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
            AND "createdAt" >= ${filterDate}
        GROUP BY date
        ORDER BY date ASC
        `,


        // //userChartData
        prisma.$queryRaw`
            SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
            CAST(COUNT(id) AS INTEGER) AS count
            FROM users
            WHERE "role" = 'USER' AND "isDeleted" = false AND "createdAt" >= ${filterDate}
            GROUP BY date 
            ORDER BY date ASC
        `,

        // // eventChartData
        prisma.$queryRaw`
            SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
            CAST(COUNT(id) AS INTEGER) AS count
            FROM events
            WHERE "createdAt" >= ${filterDate}
            GROUP BY DATE_TRUNC('day', "createdAt"), TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD')
            ORDER BY date ASC
        `
    ])

    return {
        summary: {
            totalUsers,
            totalEvents,
            totalSales: paymentStats._count.id || 0,
            totalRevenue: paymentStats._sum.amount || 0,
        },
        eventDistribution: eventStatusCount,
        // recentTransactions: recentPayments
        charts: {
            revenue: revenueChartData,
            users: userChartData,
            events: eventChartData
        }
    }
}

const getRevenueReport = async () => {
    const [topEvents, topHosts, monthlyRevenue] = await Promise.all([
        prisma.payment.groupBy({
            by: ["eventId"],
            where: { paymentStatus: PaymentStatus.PAID },
            _sum: { amount: true },
            orderBy: { _sum: { amount: "desc" } },
            take: 10
        }).then(async (rows) => {
            const eventIds = rows.map(r => r.eventId);
            const events = await prisma.event.findMany({
                where: { id: { in: eventIds } },
                select: { id: true, title: true, slug: true }
            });
            const map = Object.fromEntries(events.map(e => [e.id, e]));
            return rows.map(r => ({ ...map[r.eventId], revenue: r._sum.amount ?? 0 }));
        }),

        prisma.$queryRaw<{ hostId: string; name: string; revenue: number }[]>`
            SELECT h.id AS "hostId", u.name, COALESCE(SUM(p.amount), 0)::float AS revenue
            FROM hosts h
            JOIN users u ON u.id = h."userId"
            LEFT JOIN payments p ON p."eventId" IN (
                SELECT id FROM events WHERE "hostId" = h.id
            ) AND p."paymentStatus" = 'PAID'
            GROUP BY h.id, u.name
            ORDER BY revenue DESC
            LIMIT 10
        `,

        prisma.$queryRaw<{ month: string; revenue: number }[]>`
            SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
                   COALESCE(SUM(amount), 0)::float AS revenue
            FROM payments
            WHERE "paymentStatus" = 'PAID'
            GROUP BY month
            ORDER BY month ASC
        `
    ]);

    return { topEvents, topHosts, monthlyRevenue };
};

export const AdminService = {
    getAdminDashboardMetaData,
    getRevenueReport
}