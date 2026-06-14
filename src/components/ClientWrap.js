'use client';

import { LanguageProvider } from '@/lib/i18n/context';
import translations from '@/lib/i18n/translations';

export default function ClientWrap({ children }) {
  return (
    <LanguageProvider translations={translations}>
      {children}
    </LanguageProvider>
  );
}
