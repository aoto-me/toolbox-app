import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  type AttemptRecord,
  checkRateLimit,
  getIp,
  recordFailedAttempt,
  validateCredentials,
} from '@/lib/auth';

const loginAttempts = new Map<string, AttemptRecord>();

class RateLimitError extends CredentialsSignin {
  code = 'rate_limited';
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const validated = validateCredentials(credentials?.email, credentials?.password);
        if (!validated) return null;

        const { email, password } = validated;
        const ip = getIp(request);

        const ipKey = `ip:${ip}`;
        const emailKey = `email:${email}`;

        for (const key of [ipKey, emailKey]) {
          const result = checkRateLimit(loginAttempts, key);
          if (result.blocked) throw new RateLimitError();
          if (result.resetKey) loginAttempts.delete(key);
        }

        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        const isValid = user.length > 0 && (await bcrypt.compare(password, user[0].password));

        if (!isValid) {
          for (const key of [ipKey, emailKey]) {
            recordFailedAttempt(loginAttempts, key);
          }
          return null;
        }

        loginAttempts.delete(ipKey);
        loginAttempts.delete(emailKey);
        return {
          email: user[0].email,
          id: String(user[0].id),
          name: user[0].name,
        };
      },
      credentials: {
        email: { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード', type: 'password' },
      },
    }),
  ],
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30日
    strategy: 'jwt',
  },
});
