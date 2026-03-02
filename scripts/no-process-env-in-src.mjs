import fs from 'node:fs';
import path from 'node:path';

const violations = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('process.env')) violations.push(full.replace(process.cwd() + '/', ''));
    }
  }
};
walk(path.join(process.cwd(), 'src'));

if (violations.length) {
  console.error('process.env is forbidden in src/ client code. Found:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('no-process-env-in-src passed.');
