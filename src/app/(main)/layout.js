import { Suspense } from 'react';
import { WebWeaveProvider } from '@/lib/context/WebWeaveContext';

export default function MainLayout({ children }) {
  return (
    <WebWeaveProvider>
      <Suspense fallback={null}>{children}</Suspense>
    </WebWeaveProvider>
  );
}
