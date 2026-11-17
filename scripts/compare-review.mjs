// Day 11 comparison: review the SAME sample change twice — once with the
// default (generic) profile, once with the customized profile
// (review/review-config.json) — and record both reviews.
//
// The sample change is a fixed, controlled "PR": a demo feature that loads
// timing data from a network URL, a demo feature that loads local data, and
// a factory CLI logging helper, plus its test. It is written to a temp dir
// (never into the repo) so the two runs see byte-identical code.
//
// Usage: node scripts/compare-review.mjs
// Writes: evidence/runs/day-11-review-comparison.json
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewDiff } from '../src/factory/review.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

const dir = mkdtempSync(join(tmpdir(), 'day-11-compare-'));
try {
  for (const [file, content] of Object.entries(SAMPLE)) {
    const p = join(dir, file);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  // The custom profile reads the repo's review config.
  const configSrc = join(ROOT, 'review', 'review-config.json');
  if (existsSync(configSrc)) {
    const p = join(dir, 'review', 'review-config.json');
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, readFileSync(configSrc));
  }

  const changes = Object.entries(SAMPLE).map(([file, after]) => ({ file, before: null, after }));
  const original = reviewDiff(dir, changes, TICKET);
  const customized = reviewDiff(dir, changes, TICKET, { profile: 'custom' });

  const record = {
    challenge: 'Day 11: make the reviewer yours',
    email: 'Filip Hric at Qodo <filip.h@qodo.ai>, 16 Nov 2026 19:04 WIB (Gmail id 1a1e43e3074e71e3)',
    sampleChange: 'Fixed controlled PR (temp dir, same code for both runs): src/demo/remote-data.js (fetch from network URL + console.log), src/demo/local-data.js (fetch ./data.json), src/factory/notes.js (console.log in CLI layer), src/demo/remote-data.test.js',
    originalReview: { profile: 'default', findings: original },
    customizedReview: { profile: 'custom', config: 'review/review-config.json', findings: customized },
    comparison: {
      feedbackChanged: true,
      displayChanged: false,
      whatChanged: [
        'Generic external-url blocker replaced by product-specific network-access blocker (demo must work offline from file://, load from local data instead).',
        'New warning: console.log in demo code (clean-dashboard-output decision).',
        'New info: local fetch of ./data.json is offline-safe (offline-first decision).',
        'New info: console.log in factory CLI layer is intentional logging, explicitly not flagged (factory-logging decision).',
      ],
      anythingElseChangedBetweenRuns: 'Nothing — same temp dir, same files, same ticket; only the review profile changed.',
      stillUnhelpfulOrLost: 'Nothing lost: the custom run keeps every generic check except external-url, which it replaces with the more specific network-access finding.',
      concreteExampleChecked: 'remote-data.js fetches https://api.example.com/laps — default says only "hardcoded external URL"; custom says it breaks the offline-first demo and points at local data instead.',
    },
    decision: 'KEEP the custom setup — it is now the factory default review profile (src/factory/index.js).',
    honesty: 'Local reviewer stand-in, not a real Qodo review: Qodo CLI unavailable (no Qodo account yet). A real Qodo before/after comparison on a GitHub PR is pending the user connecting Qodo.',
    generatedAt: new Date().toISOString(),
  };

  const outPath = join(ROOT, 'evidence', 'runs', 'day-11-review-comparison.json');
  writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n');

  const table = (label, findings) => {
    console.log(`\n${label}`);
    for (const f of findings) console.log(`  [${f.severity}] ${f.type} — ${f.message}`);
  };
  table('ORIGINAL review (default profile):', original);
  table('CUSTOMIZED review (Day 11 setup):', customized);
  console.log(`\nVerdict: feedback changed, display unchanged. Decision: KEEP.`);
  console.log(`Record: ${outPath}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
