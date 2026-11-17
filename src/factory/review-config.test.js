// Tests for the Day 11 customized review profile ("make the reviewer yours").
// The same sample change is reviewed under the default profile and the
// custom profile (review/review-config.json); the two must differ exactly
// where the product decisions say they should.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReviewConfig, reviewDiff } from './review.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SAMPLE = {
  'src/demo/remote-data.js': `export async function loadLiveTiming() {
  const res = await fetch('https://api.example.com/laps');
  const laps = await res.json();
  console.log('loaded', laps.length, 'laps');
  return laps;
}
`,
  'src/demo/local-data.js': `export async function loadLocalTiming() {
  const res = await fetch('./data.json');
  return res.json();
}
`,
  'src/factory/notes.js': `export function note(msg) {
  console.log('[factory]', msg);
}
`,
  'src/demo/remote-data.test.js': `import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLiveTiming } from './remote-data.js';

test('sample: loadLiveTiming is a function', () => {
  assert.equal(typeof loadLiveTiming, 'function');
});
`,
};

const TICKET = { id: 'DAY-11-SAMPLE', tests: ['src/demo/remote-data.test.js'] };

function makeSampleRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'day-11-review-'));
  for (const [file, content] of Object.entries(SAMPLE)) {
    const p = join(dir, file);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return dir;
}

function sampleChanges(dir) {
  return Object.entries(SAMPLE).map(([file, after]) => ({
    file,
    before: null,
    after,
  }));
}

test('loadReviewConfig: reads the Day 11 setup from the repo', () => {
  const config = loadReviewConfig(ROOT);
  assert.ok(config, 'review/review-config.json should exist');
  assert.equal(config.profile, 'day-11-custom');
  const ids = config.productDecisions.map((d) => d.id);
  assert.deepEqual(ids, ['offline-first', 'zero-runtime-deps', 'factory-logging', 'clean-dashboard-output']);
});

test('loadReviewConfig: null when no config file exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'day-11-noconfig-'));
  try {
    assert.equal(loadReviewConfig(dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('default profile: generic external-url blocker, nothing product-specific', () => {
  const dir = makeSampleRoot();
  try {
    const findings = reviewDiff(dir, sampleChanges(dir), TICKET);
    const types = findings.map((f) => f.type);
    assert.ok(types.includes('external-url'), 'default flags the hardcoded external URL');
    assert.equal(findings.filter((f) => f.severity === 'blocker').length, 1);
    assert.ok(!types.includes('network-access'), 'default has no product-specific network finding');
    assert.ok(!types.includes('console-log-demo'), 'default says nothing about demo console.log');
    assert.ok(!types.includes('local-data-load'), 'default says nothing about the local fetch');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('custom profile: product-specific network blocker, demo warning, explicit allows', () => {
  const dir = makeSampleRoot();
  try {
    const findings = reviewDiff(dir, sampleChanges(dir), TICKET, { profile: 'custom' });
    const byType = Object.fromEntries(findings.map((f) => [f.type, f]));
    assert.ok(!('external-url' in byType), 'custom replaces the generic external-url finding');
    assert.equal(byType['network-access'].severity, 'blocker');
    assert.match(byType['network-access'].message, /work offline/);
    assert.match(byType['network-access'].message, /local data/);
    assert.equal(byType['console-log-demo'].severity, 'warning');
    assert.equal(byType['local-data-load'].severity, 'info');
    assert.match(byType['local-data-load'].message, /offline-safe/);
    assert.equal(byType['console-log-factory'].severity, 'info');
    assert.match(byType['console-log-factory'].message, /intentional/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('custom profile: same code, different feedback — not a different display', () => {
  const dir = makeSampleRoot();
  try {
    const before = reviewDiff(dir, sampleChanges(dir), TICKET);
    const after = reviewDiff(dir, sampleChanges(dir), TICKET, { profile: 'custom' });
    assert.notDeepEqual(
      before.map((f) => f.type).sort(),
      after.map((f) => f.type).sort(),
      'the feedback itself must change between profiles',
    );
    // Both runs review the same files with the same severities vocabulary.
    assert.ok(after.some((f) => f.severity === 'blocker'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
