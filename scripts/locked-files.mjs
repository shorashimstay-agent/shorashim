// Which of the given files .github/CODEOWNERS reserves for the owner. Handles the simple patterns
// that file uses: /folder/ (everything under it) and /file (that file).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function lockedPatterns(root = ROOT) {
  return fs
    .readFileSync(path.join(root, '.github/CODEOWNERS'), 'utf8')
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0])
    .filter((p) => p && !p.startsWith('#'))
    .map((p) => p.replace(/^\//, ''));
}

export function lockedFiles(files, root = ROOT) {
  const patterns = lockedPatterns(root);
  const posix = (f) => f.replace(/\\/g, '/');
  return files.filter((f) => patterns.some((p) => (p.endsWith('/') ? posix(f).startsWith(p) : posix(f) === p)));
}

// node scripts/locked-files.mjs < file-list: prints the files in the list that are reserved.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = fs.readFileSync(0, 'utf8').split('\n').filter(Boolean);
  for (const f of lockedFiles(files)) console.log(f);
}
