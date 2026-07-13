import PullToRefresh from '@/components/layout/PullToRefresh';
import SessionGuard from '@/components/layout/SessionGuard';
import ToastProvider from '@/components/layout/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <ToastProvider>
        <PullToRefresh />
        {children}
      </ToastProvider>
    </SessionGuard>
  );
}
