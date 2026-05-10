import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'utils', 'translations', 'ar');

const MOJIBAKE_RE = /[ØÙÃÂÊÇ]/;

// Reverse map for Windows-1252 characters in the 0x80-0x9F range.
// Some mojibake strings contain these as visible punctuation characters (e.g., "ˆ" for 0x88),
// so a strict latin1 mapping would fail. This table lets us reconstruct the original bytes.
const WINDOWS_1252_REVERSE = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87],
  ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91],
  ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98],
  ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);

function bytesFromMojibakeString(content) {
  const bytes = [];
  for (const ch of content) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const win = WINDOWS_1252_REVERSE.get(ch);
    if (win !== undefined) {
      bytes.push(win);
      continue;
    }
    // Unmappable char → keep as-is (will fail validation and be skipped)
    return null;
  }
  return Buffer.from(bytes);
}

function fixMojibakeInStringLiteral(raw) {
  // raw includes quotes; we keep the same quote type
  const quote = raw[0];
  const content = raw.slice(1, -1);
  if (!MOJIBAKE_RE.test(content)) return raw;

  const bytes = bytesFromMojibakeString(content);
  if (!bytes) return raw;

  // Convert mojibake text that was originally UTF-8 but got interpreted as Windows-1252.
  const fixed = bytes.toString('utf8');

  // Safety: skip conversions that produce replacement chars or suspicious control codes.
  if (fixed.includes('\uFFFD')) return raw;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(fixed)) return raw;
  // Require at least one Arabic letter to consider it a valid fix.
  if (!/[\u0600-\u06FF]/.test(fixed)) return raw;

  return quote + fixed + quote;
}

function fixFile(filePath) {
  const input = fs.readFileSync(filePath, 'utf8');

  // Match single-quoted and double-quoted string literals.
  // Note: translation files use plain quotes (no template literals).
  const stringLiteralRe = /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/g;

  let changed = false;
  const output = input.replace(stringLiteralRe, (match) => {
    const fixed = fixMojibakeInStringLiteral(match);
    if (fixed !== match) changed = true;
    return fixed;
  });

  if (changed) {
    fs.writeFileSync(filePath, output, 'utf8');
    return true;
  }
  return false;
}

function listTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listTsFiles(full));
    else if (entry.isFile() && full.endsWith('.ts')) files.push(full);
  }
  return files;
}

const files = listTsFiles(TARGET_DIR);
let updated = 0;

for (const file of files) {
  if (fixFile(file)) updated++;
}

console.log(`Scanned ${files.length} files. Updated ${updated} file(s).`);

