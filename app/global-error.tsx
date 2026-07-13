'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <h2>エラーが発生しました</h2>
        <button
          onClick={() => {
            unstable_retry();
          }}
        >
          再試行
        </button>
      </body>
    </html>
  );
}
