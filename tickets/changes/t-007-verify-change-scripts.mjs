// Change script for ticket T-007 (Day 14: gate must syntax-check ticket
// change scripts).
// Usage: node tickets/changes/t-007-verify-change-scripts.mjs <repo-root>
// Idempotent: exits 0 without changes if the fix is already applied.
//
// The Day 9 gate (scripts/verify.mjs, `npm run verify`) claims to
// syntax-check every source file but only walked src/ and scripts/.
// Ticket change scripts (tickets/changes/*.mjs) are executable code the
// factory runs on every ticket, so a syntax error there escaped the gate
// and was only caught when a factory run tried to execute it. This script:
//   1. exports collectJsFiles(root) from verify.mjs, including
//      tickets/changes/ in the covered files;
//   2. guards the gate runner so the module can be imported by tests
//      without exiting the process;
//   3. adds scripts/verify.test.js pinning the coverage.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-007-verify-change-scripts.mjs <repo-root>'); process.exit(2); }

function replaceOnce(src, old, replacement, label) {
  if (src.includes(replacement)) {
    console.log(label + ' already applied, skipping');
    return src;
  }
  if (!src.includes(old)) throw new Error(label + ': anchor not found — verify.mjs changed unexpectedly');
  return src.replace(old, replacement);
}

const verifyPath = join(root, 'scripts', 'verify.mjs');
const testPath = join(root, 'scripts', 'verify.test.js');
let verifySrc = readFileSync(verifyPath, 'utf8');

const OLD_HEADER = `// Full gate runner: syntax-check every source file, run all tests,
// rebuild the demo dashboard. Exit 0 only if everything is green.
// Used by \`npm run verify\` and by the factory's verify stage.`;

const NEW_HEADER = `// Full gate runner: syntax-check every source file, run all tests,
// rebuild the demo dashboard. Exit 0 only if everything is green.
// Used by \`npm run verify\` and by the factory's verify stage.
//
// Day 14 fix: the syntax check used to cover only src/ and scripts/,
// so a syntax error in a ticket change script (tickets/changes/*.mjs —
// executable code the factory runs) escaped the gate entirely and was
// only caught when the factory tried to run it. Change scripts are
// source files too; collectJsFiles() includes them now.`;

verifySrc = replaceOnce(verifySrc, OLD_HEADER, NEW_HEADER, 'header comment');

const OLD_RUN_FN = `function run(cmd, args, label) {`;

const NEW_COLLECT = `/**
 * Every JS source file the gate syntax-checks: the factory + demo
 * (src/), the scripts (scripts/), and the ticket change scripts
 * (tickets/changes/ — executable code the factory runs on every ticket).
 * Exported so tests can assert the gate's coverage (AGENTS.md rule 1).
 */
export function collectJsFiles(root) {
  return [
    ...jsFiles(join(root, 'src')),
    ...jsFiles(join(root, 'scripts')),
    ...jsFiles(join(root, 'tickets', 'changes')),
  ];
}

function run(cmd, args, label) {`;

verifySrc = replaceOnce(verifySrc, OLD_RUN_FN, NEW_COLLECT, 'collectJsFiles');

const OLD_LOOP = [
  'let ok = true;',
  "for (const f of [...jsFiles(join(ROOT, 'src')), ...jsFiles(join(ROOT, 'scripts'))]) {",
  "  ok = run('node', ['--check', f], `syntax ${f.replace(ROOT + '/', '')}`) && ok;",
  '}',
  "ok = run('node', ['--test'], 'tests') && ok;",
  "ok = run('node', ['src/demo/render.js'], 'demo rebuild') && ok;",
  '',
  'process.exit(ok ? 0 : 1);',
].join('\n');

const NEW_LOOP = `// Only run the gate when this file is executed directly, so tests can
// import collectJsFiles() without exiting the process.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let ok = true;
  for (const f of collectJsFiles(ROOT)) {
    ok = run('node', ['--check', f], 'syntax ' + f.replace(ROOT + '/', '')) && ok;
  }
  ok = run('node', ['--test'], 'tests') && ok;
  ok = run('node', ['src/demo/render.js'], 'demo rebuild') && ok;

  process.exit(ok ? 0 : 1);
}`;

verifySrc = replaceOnce(verifySrc, OLD_LOOP, NEW_LOOP, 'guarded runner');
writeFileSync(verifyPath, verifySrc);
console.log('patched scripts/verify.mjs');

const TEST_SRC = `// Tests for scripts/verify.mjs — AGENTS.md rule 1: every change ships
// with a test that fails before the change and passes after.
//
// Day 14: the gate used to syntax-check only src/ and scripts/, so a
// broken ticket change script escaped \`npm run verify\`. These tests pin
// the gate's coverage: change scripts are collected, and node_modules
// stays excluded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { collectJsFiles } from './verify.mjs';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'verify-gate-'));
  for (const dir of ['src/demo', 'scripts', 'tickets/changes', 'node_modules/some-dep']) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  writeFileSync(join(root, 'src/demo/features.js'), 'export const FEATURES = [];\\n');
  writeFileSync(join(root, 'scripts/verify.mjs'), 'export function collectJsFiles() { return []; }\\n');
  writeFileSync(join(root, 'tickets/changes/t-999-example.mjs'), 'console.log("change");\\n');
  writeFileSync(join(root, 'tickets/T-999-example.json'), '{"id":"T-999"}\\n');
  writeFileSync(join(root, 'node_modules/some-dep/index.js'), 'module.exports = {};\\n');
  return root;
}

test('collectJsFiles includes ticket change scripts', function () {
  const root = makeFixture();
  const files = collectJsFiles(root).map(function (f) { return relative(root, f); });
  assert.ok(files.includes(join('tickets', 'changes', 't-999-example.mjs')), 'change script must be collected: ' + files.join(', '));
  assert.ok(files.includes(join('src', 'demo', 'features.js')));
  assert.ok(files.includes(join('scripts', 'verify.mjs')));
});

test('collectJsFiles skips node_modules and non-JS files', function () {
  const root = makeFixture();
  const files = collectJsFiles(root).map(function (f) { return relative(root, f); });
  assert.ok(!files.some(function (f) { return f.includes('node_modules'); }), 'node_modules must stay out: ' + files.join(', '));
  assert.ok(!files.some(function (f) { return f.endsWith('.json'); }), 'ticket JSON is not a JS source file');
});
`;

if (existsSync(testPath)) {
  console.log('scripts/verify.test.js already exists, skipping');
} else {
  writeFileSync(testPath, TEST_SRC);
  console.log('wrote scripts/verify.test.js');
}
