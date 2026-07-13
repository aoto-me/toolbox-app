'use client';

import dynamic from 'next/dynamic';

const DashboardGrid = dynamic(() => import('./Grid'), { ssr: false });

export default DashboardGrid;
