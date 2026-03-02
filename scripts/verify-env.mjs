import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

const declared = new Set(
  envExample
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('VITE_'))
    .map((line) => line.split('=')[0])
);

const viteRefs = new Set();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      for (const match of content.matchAll(/VITE_[A-Z0-9]+(?:_[A-Z0-9]+)+/g)) viteRefs.add(match[0]);
    }
  }
};
walk(srcDir);

const missing = [...viteRefs].filter((key) => !declared.has(key)).sort();
if (missing.length) {
  console.error('Missing keys in .env.example:\n' + missing.join('\n'));
  process.exit(1);
}

console.log(`verify-env passed (${viteRefs.size} VITE_* references covered).`);
