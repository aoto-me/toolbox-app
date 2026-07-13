'use client';

import { RiLoader4Line, RiRefreshLine } from '@remixicon/react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/layout/Toast';
import { isIOSStandalonePWA } from '@/lib/platform';
import { isRefreshBlocked } from '@/lib/refresh-guard';
import styles from './index.module.scss';

const READY_THRESHOLD = 150;

type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export default function PullToRefresh() {
  const { showToast } = useToast();
  const [pullState, setPullState] = useState<PullState>('idle');
  const stateRef = useRef<PullState>('idle');

  useEffect(() => {
    if (!isIOSStandalonePWA()) return;

    let startY: null | number = null;

    function update(next: PullState) {
      stateRef.current = next;
      setPullState(next);
    }

    function handleTouchStart(e: TouchEvent) {
      // refreshing中（リロード処理中）は新しいジェスチャーを受け付けない
      if (stateRef.current !== 'idle') return;
      if (window.scrollY > 0 || findScrollableAncestor(e.target)) return;
      startY = e.touches[0].clientY;
    }

    function handleTouchMove(e: TouchEvent) {
      if (startY === null) return;
      const deltaY = e.touches[0].clientY - startY;

      if (deltaY <= 0 || window.scrollY > 0) {
        startY = null;
        update('idle');
        return;
      }

      e.preventDefault();
      update(deltaY >= READY_THRESHOLD ? 'ready' : 'pulling');
    }

    function handleTouchEnd() {
      if (startY === null) return;
      startY = null;

      if (stateRef.current !== 'ready') {
        update('idle');
        return;
      }

      if (isRefreshBlocked()) {
        update('idle');
        showToast('保存中のため、今は更新できません');
        return;
      }

      update('refreshing');
      window.location.reload();
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showToast]);

  if (pullState === 'idle') return null;

  return (
    <div
      aria-hidden
      className={clsx(styles.pullToRefresh, {
        [styles['pullToRefresh--ready']]: pullState === 'ready',
        [styles['pullToRefresh--refreshing']]: pullState === 'refreshing',
      })}
    >
      {pullState === 'refreshing' ? (
        <RiLoader4Line className={styles.pullToRefresh__spinner} size={20} />
      ) : (
        <RiRefreshLine className={styles.pullToRefresh__icon} size={20} />
      )}
    </div>
  );
}

function findScrollableAncestor(node: EventTarget | null): HTMLElement | null {
  let el = node instanceof HTMLElement ? node : null;
  while (el && el !== document.body) {
    const overflowY = window.getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}
