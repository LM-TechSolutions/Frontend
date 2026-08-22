import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = path.join(root, 'src/locales');
const langs = fs.readdirSync(locales).filter((d) => fs.statSync(path.join(locales, d)).isDirectory());
if (!langs.includes('en')) {
  console.error('Missing locales/en');
  process.exit(1);
}

function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') out.push(...flatten(v, key));
    else out.push(key);
  }
  return out;
}

let failed = false;
const enFiles = fs.readdirSync(path.join(locales, 'en')).filter((f) => f.endsWith('.json'));
for (const file of enFiles) {
  const en = JSON.parse(fs.readFileSync(path.join(locales, 'en', file), 'utf8'));
  const enKeys = new Set(flatten(en));
  for (const lang of langs.filter((l) => l !== 'en')) {
    const p = path.join(locales, lang, file);
    if (!fs.existsSync(p)) {
      console.error(`Missing ${lang}/${file}`);
      failed = true;
      continue;
    }
    const other = JSON.parse(fs.readFileSync(p, 'utf8'));
    const otherKeys = new Set(flatten(other));
    const missing = [...enKeys].filter((k) => !otherKeys.has(k));
    const extra = [...otherKeys].filter((k) => !enKeys.has(k));
    if (missing.length) {
      console.error(`${lang}/${file} missing ${missing.length} key(s): ${missing.slice(0, 8).join(', ')}`);
      failed = true;
    }
    if (extra.length) {
      console.warn(`${lang}/${file} extra ${extra.length} key(s)`);
    }
  }
}

if (failed) process.exit(1);
console.log(`i18n check passed for ${langs.join(', ')} (${enFiles.length} namespaces)`);
