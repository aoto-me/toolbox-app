import { auth } from '@/auth';

export async function getUserId(): Promise<null | number> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return Number(session.user.id);
}
