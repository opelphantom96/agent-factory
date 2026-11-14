// Rule Miner (local stand-in) — scans the codebase and proposes rules
// in AGENTS.md format, the way Qodo's Rule Miner would.
//
// Usage: node scripts/mine-rules.mjs
// Real Qodo Rule Miner replaces this output once the Qodo account is
// connected; until then this is the honest local equivalent.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function jsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules') continue;
      jsFiles(p, out);
    } else if (/\.m?js$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

const srcFiles = jsFiles(join(ROOT, 'src'));
const findings = [];

// 1. console.log left in shipped code?
let consoleLogs = 0;
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf8');
  consoleLogs += (text.match(/console\.log\(/g) || []).length;
}
if (consoleLogs > 0) {
  findings.push({ pattern: 'console.log in shipped code', count: consoleLogs, proposed: 'Keep console output in the CLI layer only; library modules stay silent.' });
}

// 2. TODO / FIXME markers.
let todos = 0;
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf8');
  todos += (text.match(/TODO|FIXME/g) || []).length;
}
if (todos > 0) {
  findings.push({ pattern: 'TODO/FIXME markers', count: todos, proposed: 'A TODO is a ticket: file it in tickets/ or remove it.' });
}

// 3. Modules without a test file.
const untested = [];
for (const f of srcFiles) {
  if (f.includes('.test.')) continue;
  const base = f.replace(/\.m?js$/, '');
  if (!srcFiles.includes(`${base}.test.js`) && !srcFiles.includes(`${base}.test.mjs`)) {
    untested.push(f.replace(ROOT + '/', ''));
  }
}
if (untested.length > 0) {
  findings.push({ pattern: 'modules without a test file', count: untested.length, files: untested, proposed: 'Every module ships with a test file next to it (AGENTS.md rule 1).' });
}

// 4. Over-long files (>300 lines) — a readability smell.
const longFiles = [];
for (const f of srcFiles) {
  const lines = readFileSync(f, 'utf8').split('\n').length;
  if (lines > 300) longFiles.push({ file: f.replace(ROOT + '/', ''), lines });
}
if (longFiles.length > 0) {
  findings.push({ pattern: 'files over 300 lines', count: longFiles.length, files: longFiles, proposed: 'Split modules over 300 lines into focused files.' });
}

console.log('# Rule Miner — proposed rules\n');
if (findings.length === 0) {
  console.log('No patterns found. The codebase already satisfies the mined rules.');
} else {
  findings.forEach((f, i) => {
    console.log(`${i + 1}. **${f.pattern}** (${f.count})`);
    if (f.files) console.log(`   files: ${JSON.stringify(f.files)}`);
    console.log(`   proposed rule: ${f.proposed}\n`);
  });
}
console.log(`Scanned ${srcFiles.length} source files.`);
