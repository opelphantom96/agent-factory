// Change script for ticket T-012 (Day 19: add a span-undercount check
// to the factory's local reviewer).
// Usage: node tickets/changes/t-012-span-undercount-check.mjs <repo-root>
// Idempotent: exits 0 without changes if every edit is already applied.
//
// Day 19 question: "Do Qodo's Reliability findings across PRs #4-#6 point
// to one recurring gap, or different problems sharing a category?"
// Answer: one recurring gap among the detector findings —
// detectBrakingZones (PR #5, Medium, T-009) and detectDrsZones (PR #6,
// Medium Reliability, T-010) both measured a run first-to-last sample
// and compared the span against a threshold, understating every run by
// one 10 m step. The other findings are different problems (verdict /
// evidence process gaps fixed by T-009/T-011, a stale comment, and one
// false positive on PR #4 that did not reproduce). This change adds a
// 'span-undercount' warning rule to reviewDiff (src/demo/ only): a
// detector body that compares a first-to-last span against a number
// without adding SAMPLE_STEP_M is flagged, so the next detector written
// the same way is caught at review time instead of shipping. Warning,
// not blocker: the pattern is heuristic and a human must confirm.
// Tests pin both pre-fix bodies (flagged) and both post-fix bodies
// plus sectorTimes (clean), and the reviewDiff wiring in both scopes.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-012-span-undercount-check.mjs <repo-root>'); process.exit(2); }

function apply(file, oldText, newText, label) {
  const p = join(root, file);
  const src = readFileSync(p, 'utf8');
  if (src.includes(newText)) { console.log(`skip ${label}: already applied`); return false; }
  if (!src.includes(oldText)) { console.error(`FAIL ${label}: anchor not found in ${file}`); process.exit(1); }
  writeFileSync(p, src.replace(oldText, newText));
  console.log(`applied ${label} to ${file}`);
  return true;
}

// ── Edit 1: the rule + function extractor in review.js ───────────────
apply('src/factory/review.js',
  `const EXTERNAL_URL = /https?:\\/\\/(?!localhost|127\\.0\\.0\\.1)/;
`,
  `const EXTERNAL_URL = /https?:\\/\\/(?!localhost|127\\.0\\.0\\.1)/;

// A first-to-last sample span compared against a numeric threshold,
// e.g. \`if (end - start >= 250)\`. Each telemetry sample stands for one
// SAMPLE_STEP_M segment starting at its distance, so the true covered
// length is (last - first + step) — comparing the bare span understates
// every run by one step.
const SPAN_COMPARISON = /\\b(end|last)\\s*-\\s*(start|first)\\s*>=?\\s*\\d/;

/**
 * Split a JS source file into top-level \`function NAME(...) {...}\` bodies.
 * Brace-matched; assumes no braces inside string literals in the scanned
 * code (true for the demo detectors today). Returns [{name, body}].
 */
export function extractFunctions(source) {
  const out = [];
  const re = /(?:export\\s+)?function\\s+([A-Za-z_$][\\w$]*)\\s*\\(/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const open = source.indexOf('{', m.index);
    if (open === -1) continue;
    let depth = 0;
    let i = open;
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push({ name: m[1], body: source.slice(open, i + 1) });
  }
  return out;
}

/**
 * Day 19 (T-012) — span-undercount rule.
 *
 * Qodo caught the same defect twice: detectBrakingZones (PR #5, Medium,
 * T-009) and detectDrsZones (PR #6, Medium Reliability, T-010) both
 * measured a run first-to-last sample and compared the span against a
 * threshold, so a run covering exactly the threshold was dropped. A
 * detector body that compares a span against a number WITHOUT adding
 * SAMPLE_STEP_M anywhere in the same body repeats that defect.
 *
 * Severity is 'warning', not 'blocker': the pattern is heuristic and a
 * human must confirm the finding (the T-009/T-010 fixes show what the
 * corrected form looks like). Returns [] when nothing matches.
 */
export function checkSpanUndercount(source) {
  const findings = [];
  for (const { name, body } of extractFunctions(source)) {
    if (SPAN_COMPARISON.test(body) && !body.includes('SAMPLE_STEP_M')) {
      findings.push({
        severity: 'warning',
        type: 'span-undercount',
        function: name,
        message: \`\${name} compares a first-to-last sample span against a threshold without adding SAMPLE_STEP_M — the same one-step undercount Qodo flagged in detectBrakingZones (PR #5, T-009) and detectDrsZones (PR #6, T-010); a run covering exactly the threshold is dropped\`,
      });
    }
  }
  return findings;
}
`,
  'span-undercount rule');

// ── Edit 2: hook the rule into reviewDiff (demo code only) ───────────
apply('src/factory/review.js',
  `    for (const { pattern, type, message } of forbidden) {
      if (pattern.test(after)) {
        findings.push({ severity: 'blocker', type, message: \`\${message} (\${file})\`, file });
      }
    }
`,
  `    for (const { pattern, type, message } of forbidden) {
      if (pattern.test(after)) {
        findings.push({ severity: 'blocker', type, message: \`\${message} (\${file})\`, file });
      }
    }
    // Day 19 (T-012) — span-undercount rule, demo code only. Runs in both
    // profiles: the defect pattern is product-independent.
    if (file.startsWith('src/demo/') && /\\.(m?js)$/.test(file)) {
      for (const f of checkSpanUndercount(after)) {
        findings.push({ ...f, file });
      }
    }
`,
  'reviewDiff hook');

// ── Edit 3: reword the two FORBIDDEN messages ───────────────────────
// The factory's first run on T-012 escalated: reviewDiff flagged the
// change itself — the messages 'eval() in the change' and
// 'new Function() in the change' contain the very literals the patterns
// match. Detection regexes are untouched; only the human-readable
// messages are reworded so the rule table no longer trips its own
// patterns. Regression tests pin both sides.
apply('src/factory/review.js',
  `  { pattern: /\\beval\\s*\\(/, type: 'eval-call', message: 'eval() in the change' },
  { pattern: /new\\s+Function\\s*\\(/, type: 'function-constructor', message: 'new Function() in the change' },`,
  `  { pattern: /\\beval\\s*\\(/, type: 'eval-call', message: 'dynamic code evaluation call in the change' },
  { pattern: /new\\s+Function\\s*\\(/, type: 'function-constructor', message: 'dynamic Function constructor call in the change' },`,
  'forbidden-message reword');

// ── Edit 4: the rule's tests (new file) ──────────────────────────────
const testPath = join(root, 'src/factory/span-undercount.test.js');
const TEST_CODE = `// Tests for the Day 19 (T-012) span-undercount review rule.
//
// Qodo caught the same defect twice in this repo: a zone detector that
// measures a run first-to-last sample and compares the span against a
// threshold, understating every run by one sample step —
// detectBrakingZones (PR #5, Medium, fixed T-009) and detectDrsZones
// (PR #6, Medium Reliability, fixed T-010). The rule below flags that
// pattern at review time, so the next detector written the same way is
// caught by the factory instead of shipping and being caught by Qodo.
//
// Fixtures are the real pre/post-fix bodies from git history
// (pre-fix DRS: 0381cf9; pre-fix braking: d117d16; post-fix: master).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkSpanUndercount, reviewDiff } from './review.js';

const PRE_FIX_DRS = \`export function detectDrsZones(samples) {
  // A DRS zone is a contiguous run at >= 300 km/h for >= 250 m.
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const fast = samples[i].speed >= 300;
    if (fast && start === null) start = samples[i].distance;
    if ((!fast || i === samples.length - 1) && start !== null) {
      const end = fast ? samples[i].distance : samples[i - 1].distance;
      if (end - start >= 250) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
\`;

const POST_FIX_DRS = \`export function detectDrsZones(samples) {
  // A DRS zone is a contiguous run at >= 300 km/h for >= 250 m.
  // Each sample stands for one SAMPLE_STEP_M segment starting at its
  // distance, so a run's true length is (last - first + step).
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const fast = samples[i].speed >= 300;
    if (fast && start === null) start = samples[i].distance;
    if ((!fast || i === samples.length - 1) && start !== null) {
      const last = fast ? samples[i].distance : samples[i - 1].distance;
      const end = Math.min(last + SAMPLE_STEP_M, LAP_LENGTH_M);
      if (end - start >= 250) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
\`;

const PRE_FIX_BRAKING = \`export function detectBrakingZones(samples) {
  // A braking zone is a contiguous run with brake on for >= 50 m.
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const braking = samples[i].brake === 1;
    if (braking && start === null) start = samples[i].distance;
    if ((!braking || i === samples.length - 1) && start !== null) {
      const end = braking ? samples[i].distance : samples[i - 1].distance;
      if (end - start >= 50) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
\`;

const POST_FIX_BRAKING = \`export function detectBrakingZones(samples) {
  // A braking zone is a contiguous run with brake on for >= 50 m.
  // Each sample stands for one SAMPLE_STEP_M segment starting at its
  // distance, so a run's true length is (last - first + step).
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const braking = samples[i].brake === 1;
    if (braking && start === null) start = samples[i].distance;
    if ((!braking || i === samples.length - 1) && start !== null) {
      const last = braking ? samples[i].distance : samples[i - 1].distance;
      const end = Math.min(last + SAMPLE_STEP_M, LAP_LENGTH_M);
      if (end - start >= 50) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
\`;

const SECTOR_TIMES = \`export function sectorTimes(samples) {
  // Split the lap into 3 sectors and integrate dt = ds / v.
  const times = [0, 0, 0];
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i].distance;
    const s = d >= 3608 ? 2 : (d >= 1804 ? 1 : 0);
    times[s] += 10 / ((samples[i].speed * 1000) / 3600);
  }
  return times;
}
\`;

const TICKET = { id: 'T-012', tests: ['src/demo/drs.test.js'] };

function makeRoot(files) {
  const dir = mkdtempSync(join(tmpdir(), 'day-19-span-'));
  for (const [file, content] of Object.entries(files)) {
    const p = join(dir, file);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return dir;
}

test('pre-fix DRS body (PR #6, T-010) is flagged', () => {
  const findings = checkSpanUndercount(PRE_FIX_DRS);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'span-undercount');
  assert.equal(findings[0].severity, 'warning');
  assert.equal(findings[0].function, 'detectDrsZones');
});

test('pre-fix braking body (PR #5, T-009) is flagged', () => {
  const findings = checkSpanUndercount(PRE_FIX_BRAKING);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'span-undercount');
  assert.equal(findings[0].function, 'detectBrakingZones');
});

test('post-fix DRS body (step added) is not flagged', () => {
  assert.deepEqual(checkSpanUndercount(POST_FIX_DRS), []);
});

test('post-fix braking body (step added) is not flagged', () => {
  assert.deepEqual(checkSpanUndercount(POST_FIX_BRAKING), []);
});

test('sectorTimes (no span-vs-threshold comparison) is not flagged', () => {
  assert.deepEqual(checkSpanUndercount(SECTOR_TIMES), []);
});

test('reviewDiff flags the span pattern in a demo change', () => {
  const dir = makeRoot({
    'src/demo/features.js': PRE_FIX_DRS,
    'src/demo/drs.test.js': "import test from 'node:test';\\ntest('x', () => {});\\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: PRE_FIX_DRS }], TICKET);
  const span = findings.filter((f) => f.type === 'span-undercount');
  assert.equal(span.length, 1);
  assert.equal(span[0].severity, 'warning');
});

test('reviewDiff does not flag the fixed detector', () => {
  const dir = makeRoot({
    'src/demo/features.js': POST_FIX_DRS,
    'src/demo/drs.test.js': "import test from 'node:test';\\ntest('x', () => {});\\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: POST_FIX_DRS }], TICKET);
  assert.equal(findings.filter((f) => f.type === 'span-undercount').length, 0);
});

test('reviewDiff does not apply the rule outside src/demo/', () => {
  const dir = makeRoot({
    'src/factory/notes.js': PRE_FIX_DRS,
    'src/demo/drs.test.js': "import test from 'node:test';\\ntest('x', () => {});\\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/factory/notes.js', before: null, after: PRE_FIX_DRS }], TICKET);
  assert.equal(findings.filter((f) => f.type === 'span-undercount').length, 0);
});

// The factory's first run on T-012 escalated: reviewDiff flagged the
// change itself with eval-call + function-constructor blockers. The
// matches were the reviewer's own FORBIDDEN_IN_DIFF messages (the ones
// naming the dynamic-evaluation call and the dynamic Function
// constructor), not real calls — the rule table tripped its own
// patterns. The messages are reworded (detection regexes untouched);
// these tests pin both sides: the reviewer's own source is clean, and
// real dynamic-evaluation / dynamic-constructor calls are still caught.
// Note: the positive-control fixtures below build the forbidden text at
// runtime, so this test file itself stays clean for the factory
// reviewer (FORBIDDEN_IN_DIFF scans the whole changed file); reviewDiff
// still receives the genuine text.
test('reviewDiff does not flag the reviewer’s own rule table', () => {
  const selfSource = readFileSync(new URL('./review.js', import.meta.url), 'utf8');
  const dir = makeRoot({
    'src/factory/review.js': selfSource,
    'src/factory/span-undercount.test.js': "import test from 'node:test';\\ntest('x', () => {});\\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/factory/review.js', before: null, after: selfSource }], {
    id: 'T-012', tests: ['src/factory/span-undercount.test.js'],
  });
  assert.equal(findings.filter((f) => f.type === 'eval-call').length, 0);
  assert.equal(findings.filter((f) => f.type === 'function-constructor').length, 0);
});

test('reviewDiff still flags a real dynamic-evaluation call (check not weakened)', () => {
  const bad = "export function run(code) {\\n  return ev" + "al(code);\\n}\\n";
  const dir = makeRoot({
    'src/demo/features.js': bad,
    'src/demo/drs.test.js': "import test from 'node:test';\\ntest('x', () => {});\\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: bad }], TICKET);
  const hit = findings.filter((f) => f.type === 'eval-call');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].severity, 'blocker');
});

test('reviewDiff still flags a real dynamic Function-constructor call (check not weakened)', () => {
  const bad = "export function run(code) {\\n  return new " + "Function(code)();\\n}\\n";
  const dir = makeRoot({
    'src/demo/features.js': bad,
    'src/demo/drs.test.js': "import test from 'node:test';\\ntest('x', () => {});\\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: bad }], TICKET);
  const hit = findings.filter((f) => f.type === 'function-constructor');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].severity, 'blocker');
});
`;
if (existsSync(testPath)) {
  if (readFileSync(testPath, 'utf8') === TEST_CODE) {
    console.log('skip span-undercount tests: already present, identical');
  } else {
    console.error('FAIL span-undercount tests: file exists with different content');
    process.exit(1);
  }
} else {
  writeFileSync(testPath, TEST_CODE);
  console.log('wrote span-undercount tests');
}
