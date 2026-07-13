import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from './schema';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const db = drizzle(pool);

const seedUsers = [
  { email: 'your@example.com', name: 'you', password: 'yourpassword' },
  { email: 'test@example.com', name: 'test', password: 'test1234' },
];

async function seed() {
  for (const user of seedUsers) {
    const hashed = await bcrypt.hash(user.password, 12);
    await db.insert(users).values({
      email: user.email,
      name: user.name,
      password: hashed,
    });
    console.log(`✓ ${user.name} を登録しました`);
  }
  await pool.end();
}

seed().catch(console.error);
