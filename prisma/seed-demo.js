/**
 * Seeds demo accounts used by the "Quick login" buttons on the frontend login form.
 * Re-runnable (idempotent): upserts by email and fixes the role/password each time.
 *
 *   node prisma/seed-demo.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const PASSWORD = 'Demo@1234';

const USERS = [
  { name: 'Demo User', email: 'user@eventshub.test', role: 'USER' },
  { name: 'Demo Host', email: 'host@eventshub.test', role: 'HOST' },
  { name: 'Demo Admin', email: 'admin@eventshub.test', role: 'ADMIN' },
  { name: 'Demo Super Admin', email: 'superadmin@eventshub.test', role: 'SUPER_ADMIN' },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (check backend .env)');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  for (const u of USERS) {
    const res = await pool.query(
      `INSERT INTO users (id, name, email, password, role, status, "isVerified", "isDeleted", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'ACTIVE', true, false, now(), now())
       ON CONFLICT (email) DO UPDATE
         SET role = EXCLUDED.role,
             password = EXCLUDED.password,
             status = 'ACTIVE',
             "isDeleted" = false,
             "updatedAt" = now()
       RETURNING id, role`,
      [u.name, u.email, hashedPassword, u.role]
    );

    const { id, role } = res.rows[0];

    // a HOST needs a Host record for host-scoped features
    if (role === 'HOST') {
      await pool.query(
        `INSERT INTO hosts (id, "userId", rating, "totalEventsHosted", "isVerified", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 0, 0, true, now(), now())
         ON CONFLICT ("userId") DO NOTHING`,
        [id]
      );
    }

    console.log(`✓ ${u.email.padEnd(28)} role=${role}`);
  }

  await pool.end();
  console.log(`\nAll demo accounts ready. Password for every account: ${PASSWORD}`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
