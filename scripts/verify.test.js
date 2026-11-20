// Tests for scripts/verify.mjs — AGENTS.md rule 1: every change ships
// with a test that fails before the change and passes after.
//
// Day 14: the gate used to syntax-check only src/ and scripts/, so a
// broken ticket change script escaped `npm run verify`. These tests pin
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
  writeFileSync(join(root, 'src/demo/features.js'), 'export const FEATURES = [];\n');
  writeFileSync(join(root, 'scripts/verify.mjs'), 'export function collectJsFiles() { return []; }\n');
  writeFileSync(join(root, 'tickets/changes/t-999-example.mjs'), 'console.log("change");\n');
  writeFileSync(join(root, 'tickets/T-999-example.json'), '{"id":"T-999"}\n');
  writeFileSync(join(root, 'node_modules/some-dep/index.js'), 'module.exports = {};\n');
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
