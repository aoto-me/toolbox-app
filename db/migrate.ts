import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { getDatabaseSsl } from '@/lib/db-ssl';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getDatabaseSsl(),
});

const db = drizzle(pool);

migrate(db, { migrationsFolder: './drizzle' })
  .then(() => pool.end())
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
