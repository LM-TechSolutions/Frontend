import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const files = import.meta.glob('../locales/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, unknown>>;

const resources: Record<string, Record<string, unknown>> = {};
const namespaces = new Set<string>();

for (const [path, json] of Object.entries(files)) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, ns] = match;
  namespaces.add(ns);
  resources[lang] ??= {};
  resources[lang][ns] = json;
}

const initial =
  typeof localStorage !== 'undefined' && ['en', 'am', 'om'].includes(localStorage.getItem('language') ?? '')
    ? (localStorage.getItem('language') as string)
    : 'en';

void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'en',
  ns: [...namespaces],
  defaultNS: 'common',
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  returnNull: false,
});

export default i18n;
