// Verify every STATIC t('key') / i18n.t('key') reference in the app resolves to
// a key present in en.json. Dynamic keys (containing ${...}) are reported with
// their static prefix so we can eyeball that the prefix namespace exists.
// Run: node scripts/verify-i18n-keys.mjs
import fs from 'node:fs';
import path from 'node:path';

const en = JSON.parse(fs.readFileSync('src/i18n/locales/en.json', 'utf8'));

function has(keyPath) {
  let node = en;
  for (const part of keyPath.split('.')) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else return false;
  }
  return true;
}
function hasPrefix(prefix) {
  // prefix may end mid-path; check that walking the literal segments reaches an object
  const parts = prefix.split('.').filter(Boolean);
  let node = en;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else return false;
  }
  return true;
}

const exts = new Set(['.ts', '.tsx']);
const roots = ['app', 'src'];
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (p.includes(path.join('src', 'i18n'))) continue; // skip locale defs
      walk(p);
    } else if (exts.has(path.extname(e.name))) files.push(p);
  }
}
roots.forEach(walk);

// Match t('...'), t("..."), t(`...`), i18n.t(...). Capture the first string arg.
const callRe = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;

const missing = [];
const dynamicPrefixesBad = [];
const dynamicSeen = new Set();
let staticCount = 0;
let dynamicCount = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = callRe.exec(src))) {
    const raw = m[2];
    if (raw.includes('${')) {
      dynamicCount++;
      const prefix = raw.split('${')[0].replace(/\.$/, '');
      if (prefix && !dynamicSeen.has(prefix)) {
        dynamicSeen.add(prefix);
        if (!hasPrefix(prefix)) dynamicPrefixesBad.push({ file, prefix });
      }
      continue;
    }
    // skip non-key-looking args (no dot and not a known top-level key) — but
    // still check; many valid keys are single segment under a ns. Just check.
    staticCount++;
    if (!has(raw)) missing.push({ file, key: raw });
  }
}

console.log(`Scanned ${files.length} files.`);
console.log(`Static t() keys: ${staticCount} | Dynamic t(\`...\`) keys: ${dynamicCount}`);
console.log(`\nMISSING static keys: ${missing.length}`);
for (const x of missing) console.log(`  ✗ ${x.key}   (${x.file})`);
console.log(`\nDynamic key prefixes with NO matching namespace: ${dynamicPrefixesBad.length}`);
for (const x of dynamicPrefixesBad) console.log(`  ? ${x.prefix}.*   (${x.file})`);

if (missing.length === 0 && dynamicPrefixesBad.length === 0) {
  console.log('\n✅ All static keys resolve; all dynamic prefixes have a namespace.');
} else {
  process.exitCode = 1;
}
