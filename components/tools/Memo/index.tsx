'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboardData } from '@/components/layout/DashboardDataProvider';
import { saveMemo } from '@/lib/actions/memo';
import { formatUpdatedAt } from '@/lib/format';
import { setRefreshBlocked } from '@/lib/refresh-guard';
import { createSaveSequence } from '@/lib/save-sequence';
import styles from './index.module.scss';

const MAX_LENGTH = 1000;
const DEBOUNCE_MS = 1500;

type SaveStatus = 'error' | 'idle' | 'saved' | 'saving';

export default function Memo() {
  const { initialMemo } = useDashboardData();
  const [content, setContent] = useState(initialMemo.content);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [updatedAt, setUpdatedAt] = useState<null | string>(initialMemo.updatedAt);
  const timerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveSequenceRef = useRef(createSaveSequence());

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const save = useCallback(async (text: string) => {
    // 保存が重複して走った場合に、後から発行した保存だけが結果を反映できるようにする
    const saveId = saveSequenceRef.current.start();
    setSaveStatus('saving');
    try {
      const data = await saveMemo(text);
      if (!saveSequenceRef.current.isLatest(saveId)) return;
      setUpdatedAt(data.updatedAt);
      setSaveStatus('saved');
    } catch {
      if (!saveSequenceRef.current.isLatest(saveId)) return;
      setSaveStatus('error');
    } finally {
      // この保存が最新で、かつこの後にさらに編集されてタイマーが積まれていなければ、未保存分はもう無い
      if (saveSequenceRef.current.isLatest(saveId) && timerRef.current === null) {
        setRefreshBlocked('memo', false);
      }
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length > MAX_LENGTH) return;
    setContent(text);
    setSaveStatus('saving');
    setRefreshBlocked('memo', true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void save(text);
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setRefreshBlocked('memo', false);
    };
  }, []);

  const statusLabel = () => {
    if (saveStatus === 'saving') return '保存中...';
    if (saveStatus === 'error') return '保存に失敗しました';
    if (saveStatus === 'saved' && updatedAt) return formatUpdatedAt(updatedAt);
    if (saveStatus === 'idle' && updatedAt) return formatUpdatedAt(updatedAt);
    return '';
  };

  const statusClass = () => {
    if (saveStatus === 'saving') return styles['memo__status--saving'];
    if (saveStatus === 'error') return styles['memo__status--error'];
    if (saveStatus === 'saved') return styles['memo__status--saved'];
    return '';
  };

  const charCountClass = () => {
    if (content.length > MAX_LENGTH) return styles['memo__charCount--over'];
    return '';
  };

  return (
    <div className={styles.memo}>
      <textarea
        className={styles.memo__textarea}
        id="memo-content"
        maxLength={MAX_LENGTH}
        onChange={handleChange}
        placeholder="メモを入力..."
        ref={textareaRef}
        spellCheck={false}
        value={content}
      />
      <div className={styles.memo__footer}>
        <span className={`${styles.memo__status} ${statusClass()}`}>{statusLabel()}</span>
        <span className={`${styles.memo__charCount} ${charCountClass()}`}>
          {content.length} / {MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
