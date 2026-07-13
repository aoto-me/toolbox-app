import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DashboardDataProvider } from '@/components/layout/DashboardDataProvider';
import DashboardGrid from '@/components/layout/DashboardGrid';
import SealingWax from '@/components/layout/SealingWax';
import { db } from '@/db';
import { files, memos } from '@/db/schema';
import styles from './page.module.scss';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = Number(session.user.id);

  const [memoRows, userFiles] = await Promise.all([
    db.select().from(memos).where(eq(memos.userId, userId)),
    db.select().from(files).where(eq(files.userId, userId)),
  ]);

  const memo = memoRows[0];

  return (
    <div className={styles.page}>
      <main className={styles.page__content}>
        <DashboardDataProvider
          initialFiles={userFiles.map((f) => ({
            createdAt: f.createdAt.toISOString(),
            filename: f.filename,
            id: f.id,
            mimeType: f.mimeType,
            size: f.size,
          }))}
          initialMemo={{
            content: memo?.content ?? '',
            updatedAt: memo?.updatedAt?.toISOString() ?? null,
          }}
        >
          <DashboardGrid />
        </DashboardDataProvider>
      </main>
      <SealingWax />
    </div>
  );
}
