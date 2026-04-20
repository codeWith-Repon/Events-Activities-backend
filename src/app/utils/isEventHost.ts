import { prisma } from "../../lib/prisma";

type DB = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const getEventHost = async (
  userId: string,
  eventId: string,
  db: DB = prisma
): Promise<{ hostId: string; isPrimary: boolean } | null> => {
  const host = await db.host.findUnique({ where: { userId } });
  if (!host) return null;

  const event = await db.event.findUnique({ where: { id: eventId }, select: { hostId: true } });
  if (!event) return null;

  if (event.hostId === host.id) return { hostId: host.id, isPrimary: true };

  const coHost = await db.eventCoHost.findUnique({
    where: { eventId_hostId: { eventId, hostId: host.id } }
  });

  if (!coHost) return null;
  return { hostId: host.id, isPrimary: false };
};
