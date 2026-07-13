import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDatabaseSsl } from '@/lib/db-ssl';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getDatabaseSsl(),
});

export const db = drizzle(pool, { schema });
