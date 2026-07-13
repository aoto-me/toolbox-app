import fs from 'node:fs';
import path from 'node:path';

const RDS_CA_PATH = path.join(process.cwd(), 'certs/ap-northeast-1-bundle.pem');

export function getDatabaseSsl(): false | { ca: string; rejectUnauthorized: true } {
  if (process.env.DATABASE_SSL === 'false' || process.env.NODE_ENV !== 'production') return false;
  return { ca: fs.readFileSync(RDS_CA_PATH, 'utf-8'), rejectUnauthorized: true };
}
