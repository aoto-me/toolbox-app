import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './db/schema.ts',
});
