import { WebWeaveProvider } from '@/lib/context/WebWeaveContext';

export default function MainLayout({ children }) {
  return <WebWeaveProvider>{children}</WebWeaveProvider>;
}
