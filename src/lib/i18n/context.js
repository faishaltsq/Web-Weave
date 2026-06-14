'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export const LANGUAGE_KEY = 'webweave-lang';
export const SUPPORTED_LANGUAGES = ['en', 'id'];

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: () => '',
});

export function LanguageProvider({ children, translations }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        setLangState(saved);
        return;
      }
    } catch { /* storage unavailable */ }
    const browserLang = (navigator.language || '').split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      setLangState(browserLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((value) => {
    if (!SUPPORTED_LANGUAGES.includes(value)) return;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, value);
    } catch { /* storage unavailable */ }
    setLangState(value);
  }, []);

  const t = useCallback((path) => {
    const keys = path.split('.');
    let value = translations[lang];
    for (const key of keys) {
      if (value == null) return path;
      value = value[key];
    }
    return value ?? path;
  }, [lang, translations]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
