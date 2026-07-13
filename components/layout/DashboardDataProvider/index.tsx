'use client';

import { createContext, useContext } from 'react';

export interface InitialFile {
  createdAt: string;
  filename: string;
  id: number;
  mimeType: string;
  size: number;
}

interface DashboardData {
  initialFiles: InitialFile[];
  initialMemo: {
    content: string;
    updatedAt: null | string;
  };
}

const DashboardDataContext = createContext<DashboardData>({
  initialFiles: [],
  initialMemo: { content: '', updatedAt: null },
});

export function DashboardDataProvider({
  children,
  initialFiles,
  initialMemo,
}: DashboardData & { children: React.ReactNode }) {
  return (
    <DashboardDataContext.Provider value={{ initialFiles, initialMemo }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}
