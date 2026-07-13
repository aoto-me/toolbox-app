'use client';

import { RiCloseLine } from '@remixicon/react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import styles from './index.module.scss';

interface Toast {
  id: number;
  message: string;
}
interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        dismiss(id);
      }, 7000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((t) => (
          <div className={styles.toast} key={t.id}>
            <span className={styles.toast__message}>{t.message}</span>
            <button
              aria-label="閉じる"
              className={styles.toast__close}
              onClick={() => {
                dismiss(t.id);
              }}
            >
              <RiCloseLine size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
