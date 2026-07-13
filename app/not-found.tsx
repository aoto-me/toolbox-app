import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.card__frame}>
          <div className={styles.card__inner}>
            <div className={styles.card__innerLine} />
            <div className={styles.card__header}>
              <span className={styles.card__title}>Not Found</span>
              <span className={styles.card__stars}>
                <span className={styles.card__starsInner}>
                  <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                  <img alt="" height={14} src="/img/hexagram.svg" width={13} />
                  <img alt="" height={10} src="/img/hexagram.svg" width={9} />
                </span>
              </span>
            </div>
            <div className={styles.card__body}>
              <p className={styles.message}>ページが見つかりません</p>
              <Link className={styles.homeLink} href="/">
                ボードに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
