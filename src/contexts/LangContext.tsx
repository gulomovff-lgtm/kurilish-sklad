import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Lang, Translations } from '../i18n';
import { TRANSLATIONS } from '../i18n';

interface LangContextType {
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType | null>(null);

const STORAGE_KEY = 'nirvana_lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'uz' || stored === 'ru') ? stored : 'ru';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    // Update html lang attribute
    document.documentElement.lang = l === 'uz' ? 'uz' : 'ru';
  };

  const toggleLang = () => setLang(lang === 'ru' ? 'uz' : 'ru');

  useEffect(() => {
    document.documentElement.lang = lang === 'uz' ? 'uz' : 'ru';
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, t: TRANSLATIONS[lang], setLang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
