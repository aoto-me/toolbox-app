'use client';

import { signOut } from 'next-auth/react';
import Image from 'next/image';
import styles from './index.module.scss';

export default function SealingWax() {
  return (
    <button
      aria-label="ログアウト"
      className={styles.sealingWax}
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      <Image
        alt="ログアウト"
        className={styles.sealingWax__image}
        height={75}
        src="/img/sealing-wax.webp"
        unoptimized
        width={75}
      />
    </button>
  );
}
