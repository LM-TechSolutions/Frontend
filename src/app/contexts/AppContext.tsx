import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import i18n from '../i18n';
import { api, getToken } from '../lib/api';
import { useAuth } from './AuthContext';

export type Language = 'en' | 'am' | 'om';
export type ThemeMode = 'light' | 'dark';
export type CalendarMode = 'gregorian' | 'ethiopian';

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  calendar: CalendarMode;
  setCalendar: (calendar: CalendarMode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  t: (path: string, fallback?: string, params?: Record<string, string | number>) => string;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const interpolateString = (value: string, params?: Record<string, string | number>) => {
  if (!params) return value;
  return value.replace(/\{([^}]+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
};

function readStoredLanguage(): Language {
  try {
    const saved = localStorage.getItem('language');
    if (saved === 'am' || saved === 'om' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'en';
}

function readStoredCalendar(): CalendarMode {
  try {
    return localStorage.getItem('calendar') === 'ethiopian' ? 'ethiopian' : 'gregorian';
  } catch {
    return 'gregorian';
  }
}

function readStoredTheme(): ThemeMode {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyDocumentLang(lang: Language) {
  document.documentElement.lang = lang === 'am' ? 'am' : lang === 'om' ? 'om' : 'en';
}

function translate(lang: Language, path: string, fallback?: string, params?: Record<string, string | number>) {
  const parts = path.split('.');
  const ns = parts.length > 1 ? parts[0] : 'common';
  const key = parts.length > 1 ? parts.slice(1).join('.') : path;
  const value = i18n.getResource(lang, ns, key) ?? i18n.getResource('en', ns, key);
  const text = typeof value === 'string' ? value : fallback ?? path;
  return interpolateString(text, params);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  const [calendar, setCalendarState] = useState<CalendarMode>(readStoredCalendar);
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme);

  const setLanguage = useCallback((lang: Language, syncServer = true) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    applyDocumentLang(lang);
    void i18n.changeLanguage(lang);
    if (syncServer && getToken()) {
      void api.settings.updateLocale({ locale: lang }).catch(() => undefined);
    }
  }, []);

  const setCalendar = useCallback((next: CalendarMode, syncServer = true) => {
    setCalendarState(next);
    localStorage.setItem('calendar', next);
    if (syncServer && getToken()) {
      void api.settings.updateLocale({ calendar: next }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    applyDocumentLang(language);
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (!user?.id) return;
    if (user.locale === 'en' || user.locale === 'am' || user.locale === 'om') {
      setLanguage(user.locale, false);
    }
    if (user.calendar === 'ethiopian' || user.calendar === 'gregorian') {
      setCalendar(user.calendar, false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- apply server locale once per session

  const value = useMemo(
    () => ({
      language,
      setLanguage: (lang: Language) => setLanguage(lang, true),
      calendar,
      setCalendar: (next: CalendarMode) => setCalendar(next, true),
      theme,
      setTheme,
      t: (path: string, fallback?: string, params?: Record<string, string | number>) =>
        translate(language, path, fallback, params),
    }),
    [language, calendar, theme, setLanguage, setCalendar]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
