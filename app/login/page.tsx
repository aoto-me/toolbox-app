'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './page.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.code === 'rate_limited') {
          setError('時間をおいてからログインしてください');
        } else {
          setError('メールアドレスまたはパスワードが違います');
        }
        setLoading(false);
      } else {
        router.push('/');
      }
    } catch {
      setError('サーバーエラーが発生しています');
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.card__frame}>
          <div className={styles.card__inner}>
            <div className={styles.card__innerLine} />
            <div className={styles.card__header}>
              <span className={styles.card__title}>Login</span>
              <span className={styles.card__stars}>
                <span className={styles.card__starsInner}>
                  <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                  <img alt="" height={14} src="/img/hexagram.svg" width={13} />
                  <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                </span>
              </span>
            </div>
            <div className={styles.card__body}>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">
                    メールアドレス
                  </label>
                  <input
                    disabled={loading}
                    id="email"
                    maxLength={254}
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                    required
                    type="email"
                    value={email}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">
                    パスワード
                  </label>
                  <input
                    disabled={loading}
                    id="password"
                    maxLength={128}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    required
                    type="password"
                    value={password}
                  />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <button className={styles.submit} disabled={loading} type="submit">
                  {loading ? <span className={styles.spinner} /> : 'ログイン'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
