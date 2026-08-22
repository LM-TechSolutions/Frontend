/**
 * Locale JSON under src/locales is the source of truth.
 * Re-run only if translations are still embedded in AppContext.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/app/contexts/AppContext.tsx'), 'utf8');
const start = src.indexOf('const translations = ');
const end = src.indexOf('\ntype TranslationKey');
if (start < 0 || end < 0) {
  console.log('AppContext no longer embeds translations; locales/ is canonical.');
  process.exit(0);
}
const objectSrc = src.slice(start + 'const translations = '.length, end).trim().replace(/;$/, '');
const translations = vm.runInNewContext('(' + objectSrc + ')');

const outDir = path.join(root, 'src/locales');
for (const lang of Object.keys(translations)) {
  for (const ns of Object.keys(translations[lang])) {
    const dir = path.join(outDir, lang);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(translations[lang][ns], null, 2) + '\n');
  }
}
console.log('Wrote locale files to', outDir);
