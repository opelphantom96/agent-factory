// Tests for the Day 19 (T-012) span-undercount review rule.
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
import { checkSpanUndercount, extractFunctions, reviewDiff, stripComments } from './review.js';

const PRE_FIX_DRS = `export function detectDrsZones(samples) {
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
`;

const POST_FIX_DRS = `export function detectDrsZones(samples) {
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
`;

const PRE_FIX_BRAKING = `export function detectBrakingZones(samples) {
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
`;

const POST_FIX_BRAKING = `export function detectBrakingZones(samples) {
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
`;

const SECTOR_TIMES = `export function sectorTimes(samples) {
  // Split the lap into 3 sectors and integrate dt = ds / v.
  const times = [0, 0, 0];
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i].distance;
    const s = d >= 3608 ? 2 : (d >= 1804 ? 1 : 0);
    times[s] += 10 / ((samples[i].speed * 1000) / 3600);
  }
  return times;
}
`;

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
    'src/demo/drs.test.js': "import test from 'node:test';\ntest('x', () => {});\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: PRE_FIX_DRS }], TICKET);
  const span = findings.filter((f) => f.type === 'span-undercount');
  assert.equal(span.length, 1);
  assert.equal(span[0].severity, 'warning');
});

test('reviewDiff does not flag the fixed detector', () => {
  const dir = makeRoot({
    'src/demo/features.js': POST_FIX_DRS,
    'src/demo/drs.test.js': "import test from 'node:test';\ntest('x', () => {});\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: POST_FIX_DRS }], TICKET);
  assert.equal(findings.filter((f) => f.type === 'span-undercount').length, 0);
});

test('reviewDiff does not apply the rule outside src/demo/', () => {
  const dir = makeRoot({
    'src/factory/notes.js': PRE_FIX_DRS,
    'src/demo/drs.test.js': "import test from 'node:test';\ntest('x', () => {});\n",
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
    'src/factory/span-undercount.test.js': "import test from 'node:test';\ntest('x', () => {});\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/factory/review.js', before: null, after: selfSource }], {
    id: 'T-012', tests: ['src/factory/span-undercount.test.js'],
  });
  assert.equal(findings.filter((f) => f.type === 'eval-call').length, 0);
  assert.equal(findings.filter((f) => f.type === 'function-constructor').length, 0);
});

test('reviewDiff still flags a real dynamic-evaluation call (check not weakened)', () => {
  const bad = "export function run(code) {\n  return ev" + "al(code);\n}\n";
  const dir = makeRoot({
    'src/demo/features.js': bad,
    'src/demo/drs.test.js': "import test from 'node:test';\ntest('x', () => {});\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: bad }], TICKET);
  const hit = findings.filter((f) => f.type === 'eval-call');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].severity, 'blocker');
});

test('reviewDiff still flags a real dynamic Function-constructor call (check not weakened)', () => {
  const bad = "export function run(code) {\n  return new " + "Function(code)();\n}\n";
  const dir = makeRoot({
    'src/demo/features.js': bad,
    'src/demo/drs.test.js': "import test from 'node:test';\ntest('x', () => {});\n",
  });
  const findings = reviewDiff(dir, [{ file: 'src/demo/features.js', before: null, after: bad }], TICKET);
  const hit = findings.filter((f) => f.type === 'function-constructor');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].severity, 'blocker');
});

// ── PR #7 follow-up (Qodo review on the T-012 PR) ────────────────────
// Qodo found 4 issues in the rule as first shipped. The fixtures below
// reproduce them; the fixes are in review.js (comment stripping, wider
// span pattern, single-pass extraction).

// Finding 1 — the step was reverted from the end calculation but the
// explanatory comment still mentions SAMPLE_STEP_M. The comment must not
// stand in for the code.
const COMMENT_ONLY_STEP_DRS = `export function detectDrsZones(samples) {
  // A DRS zone is a contiguous run at >= 300 km/h for >= 250 m.
  // Each sample stands for one SAMPLE_STEP_M segment starting at its
  // distance, so a run's true length is (last - first + step).
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const fast = samples[i].speed >= 300;
    if (fast && start === null) start = samples[i].distance;
    if ((!fast || i === samples.length - 1) && start !== null) {
      const end = samples[i].distance;
      if (end - start >= 250) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
`;

// Finding 1, other side — a span comparison that exists only in comments
// (line + block) must NOT be flagged.
const COMMENT_ONLY_COMPARISON = `export function detectZones(samples) {
  // Old check was: if (end - start >= 250) zones.push({ startM: start, endM: end });
  /* Blocked form: (end - start) >= MIN_ZONE_M — replaced below. */
  const zones = [];
  let end = 0;
  for (const s of samples) end = Math.max(end, s.distance);
  return zones;
}
`;

// Finding 2 — equivalent span comparisons the first pattern missed:
// parenthesized subtraction, named threshold, both at once.
const PAREN_SPAN = `export function detectZones(samples) {
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].fast && start === null) start = samples[i].distance;
    if (!samples[i].fast && start !== null) {
      const end = samples[i - 1].distance;
      if ((end - start) >= 250) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
`;

const NAMED_THRESHOLD_SPAN = `export function detectZones(samples) {
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].fast && start === null) start = samples[i].distance;
    if (!samples[i].fast && start !== null) {
      const end = samples[i - 1].distance;
      if (end - start >= MIN_ZONE_M) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
`;

const PAREN_NAMED_SPAN = `export function detectZones(samples) {
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].fast && start === null) start = samples[i].distance;
    if (!samples[i].fast && start !== null) {
      const last = samples[i - 1].distance;
      if ((last - start) >= ZONE_MIN_M) zones.push({ startM: start, endM: last });
      start = null;
    }
  }
  return zones;
}
`;

// Finding 2, other side — parenthesized + named threshold WITH the step
// added in code is the corrected form and must stay clean.
const PAREN_NAMED_FIXED = `export function detectZones(samples) {
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].fast && start === null) start = samples[i].distance;
    if (!samples[i].fast && start !== null) {
      const last = samples[i - 1].distance;
      const end = Math.min(last + SAMPLE_STEP_M, LAP_LENGTH_M);
      if ((end - start) >= MIN_ZONE_M) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}
`;

test('PR #7 finding 1: step only in a comment does not suppress the warning', () => {
  const findings = checkSpanUndercount(COMMENT_ONLY_STEP_DRS);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'span-undercount');
  assert.equal(findings[0].function, 'detectDrsZones');
});

test('PR #7 finding 1: comparison only in comments is not flagged', () => {
  assert.deepEqual(checkSpanUndercount(COMMENT_ONLY_COMPARISON), []);
});

test('PR #7 finding 2: parenthesized span comparison is flagged', () => {
  const findings = checkSpanUndercount(PAREN_SPAN);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'span-undercount');
});

test('PR #7 finding 2: named-threshold span comparison is flagged', () => {
  const findings = checkSpanUndercount(NAMED_THRESHOLD_SPAN);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'span-undercount');
});

test('PR #7 finding 2: parenthesized + named-threshold span is flagged', () => {
  const findings = checkSpanUndercount(PAREN_NAMED_SPAN);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'span-undercount');
});

test('PR #7 finding 2: parenthesized + named span with the step added is clean', () => {
  assert.deepEqual(checkSpanUndercount(PAREN_NAMED_FIXED), []);
});

// Finding 3 — the extractor must handle nested declarations without
// rescanning overlapping bodies. These pin the behaviour the single-pass
// rewrite must preserve (extraction order, bodies, span detection).
test('PR #7 finding 3: deeply nested declarations extract in order', () => {
  const depth = 60;
  let src = '';
  for (let i = 0; i < depth; i++) src += `function f${i}() {\n`;
  src += '  return 1;\n';
  for (let i = depth - 1; i >= 0; i--) src += '}\n';
  const fns = extractFunctions(src);
  assert.equal(fns.length, depth);
  assert.deepEqual(fns.map((f) => f.name), Array.from({ length: depth }, (_, i) => `f${i}`));
  assert.match(fns[depth - 1].body, /return 1;/);
  assert.match(fns[0].body, /function f59/);
});

test('PR #7 finding 3: many top-level functions extract', () => {
  let src = '';
  for (let i = 0; i < 500; i++) src += `function g${i}() { return ${i}; }\n`;
  const fns = extractFunctions(src);
  assert.equal(fns.length, 500);
  assert.equal(fns[499].name, 'g499');
  assert.match(fns[499].body, /return 499;/);
});

test('PR #7 finding 3: body brace is taken after a default object parameter', () => {
  const fns = extractFunctions('function f(o = {}) { return o; }\n');
  assert.equal(fns.length, 1);
  assert.match(fns[0].body, /return o;/);
});

test('PR #7 finding 3: span pattern in a nested detector is still flagged', () => {
  const src = `export function outer(samples) {
  function inner(samples) {
    const end = samples[1].distance;
    const start = samples[0].distance;
    if (end - start >= 250) return true;
    return false;
  }
  return inner(samples);
}
`;
  const findings = checkSpanUndercount(src);
  assert.equal(findings.length, 2);
  assert.deepEqual(findings.map((f) => f.function).sort(), ['inner', 'outer']);
});

test('PR #7 finding 1: stripComments removes line and block comments, keeps strings', () => {
  const src = `const a = 1; // trailing SAMPLE_STEP_M
/* block
   SAMPLE_STEP_M */
const path = 'a // b'; // end - start >= 250
const b = 2;
`;
  const stripped = stripComments(src);
  assert.ok(!stripped.includes('SAMPLE_STEP_M'));
  assert.ok(!stripped.includes('end - start'));
  assert.ok(stripped.includes("'a // b'"));
  assert.equal(stripped.split('\n').length, src.split('\n').length);
  assert.ok(stripped.includes('const a = 1;'));
  assert.ok(stripped.includes('const b = 2;'));
});
