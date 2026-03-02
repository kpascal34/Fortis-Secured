import { execSync } from 'node:child_process';

let output = '';
try {
  output = execSync("find src -type f | rg ' 2\\.(js|jsx|ts|tsx)$'", { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
} catch {
  output = '';
}

const files = output.split('\n').filter(Boolean);
if (files.length) {
  console.error('Duplicate * 2.* files found:\n' + files.join('\n'));
  process.exit(1);
}

console.log('no-duplicate-2-files passed.');
