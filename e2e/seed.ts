import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '../db/schema';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://testuser:testpassword@db-test:5432/toolbox_test';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });
const db = drizzle(pool);

async function seed() {
  await db.execute(sql`TRUNCATE users CASCADE`);

  const hashed = await bcrypt.hash('test1234', 12);
  await db.insert(users).values({
    email: 'test@example.com',
    name: 'test',
    password: hashed,
  });

  console.log('E2E seed complete');
  await pool.end();
}

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
