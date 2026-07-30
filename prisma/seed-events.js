/**
 * Seeds realistic events hosted by the demo host account, plus a few
 * participations for the demo user so every screen has something to show.
 *
 * Re-runnable (idempotent): events upsert by slug, participants by (eventId, userId).
 * Dates are relative to "today", so the data never goes stale — re-run it any
 * time the upcoming events drift into the past.
 *
 *   node prisma/seed-events.js
 *
 * Run seed-demo.js first — this needs host@eventshub.test and user@eventshub.test.
 */
require('dotenv').config();
const { Pool } = require('pg');

const HOST_EMAIL = 'host@eventshub.test';
const USER_EMAIL = 'user@eventshub.test';

/** Deterministic placeholder art — swap for Cloudinary uploads when you have them. */
const img = (seed, n = 1) =>
  Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/1200/800`);

/** `days` is relative to today: negative = past, positive = upcoming. */
const EVENTS = [
  {
    slug: 'sunrise-summit-trek-nilgiri-ridge',
    title: 'Sunrise Summit Trek at Nilgiri Ridge',
    category: 'Hiking',
    days: 6,
    time: '05:30',
    location: 'Nilgiri Ridge Trailhead, North Gate',
    description:
      'We set off in the dark and reach the ridge just as the valley starts to glow. It is a 9km round trip with one steep scramble near the top — nothing technical, but you will want proper shoes. Head torches provided. We stop for chai and paratha at the summit before heading back down by mid-morning.',
    min: 4,
    max: 18,
    fee: 0,
  },
  {
    slug: 'farm-to-table-supper-club-autumn-harvest',
    title: 'Farm-to-Table Supper Club: Autumn Harvest',
    category: 'Dining',
    days: 10,
    time: '19:00',
    location: 'The Old Granary, Riverside Lane',
    description:
      'One long table, twenty seats, five courses built entirely from what came out of the ground this week. The menu is decided the morning of the dinner, so expect surprises. Vegetarian by default with an optional slow-cooked lamb course. Includes a glass of natural wine on arrival; bring another bottle if you like.',
    min: 8,
    max: 20,
    fee: 45,
  },
  {
    slug: 'golden-hour-street-photography-walk',
    title: 'Golden Hour Street Photography Walk',
    category: 'Photography',
    days: 3,
    time: '16:45',
    location: 'Old Quarter, meet at the clock tower',
    description:
      'A slow two-hour wander through the old quarter as the light drops. We cover reading light, working close without being intrusive, and shooting strangers politely. Bring any camera — phones absolutely welcome. We finish at a rooftop cafe and review each other’s frames over coffee.',
    min: 3,
    max: 12,
    fee: 15,
  },
  {
    slug: 'sunday-riverside-10k-run-club',
    title: 'Sunday Riverside 10K Run Club',
    category: 'Health & Fitness',
    days: 2,
    time: '07:00',
    location: 'Riverside Park, east entrance',
    description:
      'A friendly 10K along the water at conversational pace — roughly 6:00–6:30 per km, with a walk-run group at the back so nobody finishes alone. Water station at the halfway bridge. Stick around afterwards for stretches and breakfast at the boathouse.',
    min: 2,
    max: 40,
    fee: 0,
  },
  {
    slug: 'intro-to-typescript-build-your-first-api',
    title: 'Intro to TypeScript: Build Your First API',
    category: 'Education',
    days: 14,
    time: '10:00',
    location: 'Craft Coworking, Level 3 Workshop Room',
    description:
      'A hands-on Saturday session. By lunch you will have a typed Express API running locally with real routes and validation; by the end you will have deployed it. Bring a laptop with Node 20 installed. Assumes you know some JavaScript but zero TypeScript. Lunch and far too much coffee included.',
    min: 5,
    max: 24,
    fee: 30,
  },
  {
    slug: 'life-drawing-studio-charcoal-and-ink',
    title: 'Life Drawing Studio: Charcoal & Ink',
    category: 'Art & Design',
    days: 8,
    time: '18:30',
    location: 'Warehouse 12 Studios, Dock Road',
    description:
      'Three hours of untutored life drawing with a professional model — short gesture poses to warm up, then two long sits. Easels, boards, charcoal and ink are all provided; bring your own paper if you are fussy about it. Complete beginners are genuinely welcome, nobody is watching your paper.',
    min: 4,
    max: 16,
    fee: 22,
  },
  {
    slug: 'open-mic-night-acoustic-sessions',
    title: 'Open Mic Night: Acoustic Sessions',
    category: 'Entertainment',
    days: 5,
    time: '20:00',
    location: 'The Bell & Whistle, back room',
    description:
      'Sign-up starts at half seven, first act on at eight. Two songs each, acoustic only — house guitar and a piano are there if you would rather travel light. Come to play or just come to listen; the back room holds about sixty and it fills up.',
    min: 5,
    max: 60,
    fee: 0,
  },
  {
    slug: 'riverside-cleanup-and-tree-planting-day',
    title: 'Riverside Cleanup & Tree Planting Day',
    category: 'Charity',
    days: 12,
    time: '09:00',
    location: 'Riverside Park, south meadow',
    description:
      'A morning clearing plastic from the riverbank followed by planting forty native saplings along the south meadow. Gloves, pickers, bags and spades all provided — just wear boots you do not mind ruining. Family friendly; under-12s welcome with an adult. Soup and bread at noon.',
    min: 10,
    max: 50,
    fee: 0,
  },
  {
    slug: 'ramen-masterclass-with-chef-aiko',
    title: 'Ramen Masterclass with Chef Aiko',
    category: 'Dining',
    days: 21,
    time: '14:00',
    location: 'Kitchen Studio, 8 Mill Street',
    description:
      'Build a proper bowl from the ground up: a 12-hour tonkotsu broth we started the night before, hand-pulled noodles, tare, ajitama eggs and chashu. You will make and eat your own bowl, then take home the recipes and a jar of tare. Limited to twelve so everyone gets bench space.',
    min: 6,
    max: 12,
    fee: 65,
  },
  {
    slug: 'moonlight-forest-night-walk',
    title: 'Moonlight Forest Night Walk',
    category: 'Hiking',
    days: 17,
    time: '20:30',
    location: 'Blackpine Forest, ranger station car park',
    description:
      'A guided 5km walk through Blackpine with no torches after the first kilometre — your eyes adjust faster than you would think. A ranger talks through night sounds and what is moving around us. Easy, flat terrain. Warm layers essential, the temperature drops hard under the canopy.',
    min: 6,
    max: 20,
    fee: 12,
  },
  // Past + COMPLETED, so "Attended" and the review flow have something to work with.
  {
    slug: 'winter-light-architecture-photo-walk',
    title: 'Winter Light: Architecture Photo Walk',
    category: 'Photography',
    days: -20,
    time: '09:30',
    location: 'Civic Centre steps',
    description:
      'A morning working the hard geometric light of midwinter across the civic quarter — brutalist concrete, glass towers and the covered market. We covered line, symmetry and shooting into the sun without blowing highlights.',
    min: 3,
    max: 14,
    fee: 15,
    status: 'COMPLETED',
  },
  {
    slug: 'spring-wine-tasting-old-world-vs-new',
    title: 'Spring Wine Tasting: Old World vs New',
    category: 'Dining',
    days: -35,
    time: '18:00',
    location: 'Cellar 9, Vintners Row',
    description:
      'Eight glasses poured blind in pairs — the same grape from a French or Italian producer against a Chilean, Australian or Californian one. Guests guessed which was which and were wrong more often than not. Cheese and charcuterie throughout.',
    min: 6,
    max: 18,
    fee: 38,
    status: 'COMPLETED',
  },
];

/** Participations for the demo user, so /my-events is not empty. */
const PARTICIPATIONS = [
  { slug: 'sunrise-summit-trek-nilgiri-ridge', joinStatus: 'APPROVED', paymentStatus: 'PENDING' },
  { slug: 'sunday-riverside-10k-run-club', joinStatus: 'APPROVED', paymentStatus: 'PENDING' },
  { slug: 'ramen-masterclass-with-chef-aiko', joinStatus: 'PENDING', paymentStatus: 'PENDING' },
  { slug: 'farm-to-table-supper-club-autumn-harvest', joinStatus: 'WAITLISTED', paymentStatus: 'PENDING' },
  // Both completed — one gets rated by you in the UI, the other is already reviewable.
  { slug: 'winter-light-architecture-photo-walk', joinStatus: 'APPROVED', paymentStatus: 'PAID' },
  { slug: 'spring-wine-tasting-old-world-vs-new', joinStatus: 'APPROVED', paymentStatus: 'PAID' },
];

const dateFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (check backend .env)');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const hostRes = await pool.query(
    `SELECT h.id FROM hosts h JOIN users u ON u.id = h."userId" WHERE u.email = $1`,
    [HOST_EMAIL]
  );
  if (hostRes.rowCount === 0) {
    throw new Error(`No host record for ${HOST_EMAIL} — run: node prisma/seed-demo.js`);
  }
  const hostId = hostRes.rows[0].id;

  const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [USER_EMAIL]);
  if (userRes.rowCount === 0) {
    throw new Error(`No user ${USER_EMAIL} — run: node prisma/seed-demo.js`);
  }
  const userId = userRes.rows[0].id;

  const idBySlug = {};

  for (const e of EVENTS) {
    const status = e.status ?? 'OPEN';
    const res = await pool.query(
      `INSERT INTO events
         (id, title, slug, category, description, date, time, location,
          "minParticipants", "maxParticipants", fee, images, status, "viewCount",
          "hostId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now())
       ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title,
             category = EXCLUDED.category,
             description = EXCLUDED.description,
             date = EXCLUDED.date,
             time = EXCLUDED.time,
             location = EXCLUDED.location,
             "minParticipants" = EXCLUDED."minParticipants",
             "maxParticipants" = EXCLUDED."maxParticipants",
             fee = EXCLUDED.fee,
             images = EXCLUDED.images,
             status = EXCLUDED.status,
             "hostId" = EXCLUDED."hostId",
             "updatedAt" = now()
       RETURNING id`,
      [
        e.title,
        e.slug,
        e.category,
        e.description,
        dateFromNow(e.days),
        e.time,
        e.location,
        e.min,
        e.max,
        e.fee,
        img(e.slug, 2),
        status,
        Math.floor(Math.random() * 400) + 40,
        hostId,
      ]
    );

    idBySlug[e.slug] = res.rows[0].id;
    const when = e.days < 0 ? `${-e.days}d ago` : `in ${e.days}d`;
    console.log(`✓ ${e.title.slice(0, 46).padEnd(48)} ${status.padEnd(9)} ${when}`);
  }

  for (const p of PARTICIPATIONS) {
    const eventId = idBySlug[p.slug];
    if (!eventId) continue;

    await pool.query(
      `INSERT INTO event_participants
         (id, "eventId", "userId", "joinStatus", "paymentStatus", "reminderSent",
          "checkedIn", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, false, now(), now())
       ON CONFLICT ("eventId", "userId") DO UPDATE
         SET "joinStatus" = EXCLUDED."joinStatus",
             "paymentStatus" = EXCLUDED."paymentStatus",
             "updatedAt" = now()`,
      [eventId, userId, p.joinStatus, p.paymentStatus]
    );

    console.log(`  → demo user ${p.joinStatus} on ${p.slug}`);
  }

  await pool.query(
    `UPDATE hosts SET "totalEventsHosted" = (SELECT count(*) FROM events WHERE "hostId" = $1),
                      "updatedAt" = now()
     WHERE id = $1`,
    [hostId]
  );

  await pool.end();
  console.log(
    `\n${EVENTS.length} events seeded for ${HOST_EMAIL}, ` +
      `${PARTICIPATIONS.length} participations for ${USER_EMAIL}.`
  );
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
