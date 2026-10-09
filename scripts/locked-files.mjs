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
  return files.filter((f) => patterns.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
}
