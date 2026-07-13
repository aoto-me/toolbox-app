'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionExpireGuard>{children}</SessionExpireGuard>
    </SessionProvider>
  );
}

function SessionExpireGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  // wasAuthenticatedで「一度でも認証済みだったか」を追跡する
  // false のまま unauthenticated になった場合はプロキシが対処するため、ここでは何もしない
  const wasAuthenticated = useRef(false);
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      wasAuthenticated.current = true;
    } else if (status === 'unauthenticated' && wasAuthenticated.current) {
      // 操作中にセッションが切れた場合のみアラートを表示する
      setShowAlert(true);
    }
  }, [status]);

  const handleOk = () => {
    setShowAlert(false);
    router.push('/login');
  };

  return (
    <>
      {children}
      {showAlert && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <div className={styles.dialog__frame}>
              <div className={styles.dialog__inner}>
                <div className={styles.dialog__innerLine} />
                <div className={styles.dialog__header}>
                  <span className={styles.dialog__title}>Session Expired</span>
                  <span className={styles.dialog__stars}>
                    <span className={styles.dialog__starsInner}>
                      <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                      <img alt="" height={14} src="/img/hexagram.svg" width={13} />
                      <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                    </span>
                  </span>
                </div>
                <div className={styles.dialog__body}>
                  <p className={styles.dialog__message}>
                    セッションが切れました。
                    <br />
                    再ログインしてください
                  </p>
                  <button className={styles.dialog__button} onClick={handleOk}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
