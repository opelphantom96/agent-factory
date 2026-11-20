// Change script for ticket T-009 (Day 14 follow-up: fix the 2 Medium
// findings Qodo reported on PR #5).
// Usage: node tickets/changes/t-009-fix-qodo-mediums.mjs <repo-root>
// Idempotent: exits 0 without changes if every fix is already applied.
//
// Finding 1 — "Braking zones under-measured by one sample step":
// detectBrakingZones measured a run first-to-last sample, understating
// every run by one 10 m step (a 50 m run read as 40 m and was dropped).
// Fix: endM is the true end of the last sample's segment
// (last + SAMPLE_STEP_M, clamped to the lap length); the threshold
// compares the true covered length. Tests pin the 50 m / 40 m boundary
// and the exact seed-42 zones.
//
// Finding 2 — "Approval evidence rests on a stub, not a Qodo review":
// the T-008 evidence record wrote qodo.available=false next to a bare
// verdict APPROVED. Fix (root cause, src/factory/index.js — NOT
// scripts/): when Qodo is unavailable the factory now records
// approvalBasis + qodoReviewPending on every run record. The T-008
// record itself is corrected in place with the same fields plus a
// correction note; no stage results or the verdict value were altered.
//
// This change touches nothing under scripts/**.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-009-fix-qodo-mediums.mjs <repo-root>'); process.exit(2); }

function apply(file, oldText, newText, label) {
  const p = join(root, file);
  const src = readFileSync(p, 'utf8');
  if (src.includes(newText)) { console.log(`skip ${label}: already applied`); return false; }
  if (!src.includes(oldText)) { console.error(`FAIL ${label}: anchor not found in ${file}`); process.exit(1); }
  writeFileSync(p, src.replace(oldText, newText));
  console.log(`applied ${label} to ${file}`);
  return true;
}

// ── Finding 1a: features.js — import the sample/lap constants ───────
apply('src/demo/features.js',
  "import { generateLap } from './telemetry.js';",
  "import { generateLap, SAMPLE_STEP_M, LAP_LENGTH_M } from './telemetry.js';",
  'braking import');

// ── Finding 1b: features.js — measure the run's true covered length ──
apply('src/demo/features.js',
  `export function detectBrakingZones(samples) {
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
}`,
  `export function detectBrakingZones(samples) {
  // A braking zone is a contiguous run with brake on for >= 50 m.
  // Each sample stands for one SAMPLE_STEP_M segment starting at its
  // distance, so a run's true length is (last - first + step): a run of
  // five samples covers 50 m. Measuring first-to-last sample only
  // understates every run by one step (a 50 m run read as 40 m and was
  // dropped; every run under 60 m of coverage was missed). endM is the
  // true end of the last sample's segment, clamped to the lap length.
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
}`,
  'braking measurement');

// ── Finding 1c: braking.test.js — boundary + exact-zone tests ────────
apply('src/demo/braking.test.js',
  `  assert.equal(zones.length, 0, 'a 30 m brake tap is not a zone');
});`,
  `  assert.equal(zones.length, 0, 'a 30 m brake tap is not a zone');
});

test('a 50 m braking run is detected (one-step boundary)', () => {
  // Five consecutive samples at 10 m spacing cover exactly 50 m of track:
  // each sample stands for the 10 m segment starting at its distance.
  const samples = [];
  for (let d = 0; d <= 200; d += 10) {
    samples.push({ distance: d, speed: 200, throttle: 0, brake: d >= 100 && d <= 140 ? 1 : 0, gear: 4 });
  }
  const zones = detectBrakingZones(samples);
  assert.deepEqual(zones, [{ startM: 100, endM: 150 }], 'a 50 m run is a zone');
});

test('a 40 m braking run is not a zone (just under the threshold)', () => {
  // Four consecutive samples cover 40 m — under the 50 m threshold.
  const samples = [];
  for (let d = 0; d <= 200; d += 10) {
    samples.push({ distance: d, speed: 200, throttle: 0, brake: d >= 100 && d <= 130 ? 1 : 0, gear: 4 });
  }
  const zones = detectBrakingZones(samples);
  assert.equal(zones.length, 0, 'a 40 m run is not a zone');
});

test('seed 42 zones report their full covered length', () => {
  // The five long braking runs on lap seed 42, with endM at the true end
  // of the last sample's 10 m segment (not at the last sample itself).
  const { samples } = generateLap(42);
  assert.deepEqual(detectBrakingZones(samples), [
    { startM: 320, endM: 670 },
    { startM: 1610, endM: 1960 },
    { startM: 2620, endM: 2960 },
    { startM: 3710, endM: 4090 },
    { startM: 4800, endM: 5160 },
  ]);
});`,
  'braking boundary tests');

// ── Finding 2a: index.js — qualify the verdict when Qodo is absent ───
apply('src/factory/index.js',
  `  // ── 7. approve / escalate ────────────────────────────────────────────
  const unresolved = blockers.filter((b) => b.severity === 'blocker');
  record.verdict = unresolved.length === 0 ? 'APPROVED' : 'ESCALATED';
  record.demoArtifact = 'apps/f1-telemetry/index.html';`,
  `  // ── 7. approve / escalate ────────────────────────────────────────────
  const unresolved = blockers.filter((b) => b.severity === 'blocker');
  record.verdict = unresolved.length === 0 ? 'APPROVED' : 'ESCALATED';
  // The factory's APPROVED verdict covers the LOCAL gates only (spec,
  // plan review, code review, verify). When the Qodo review never ran
  // (Qodo CLI unavailable), a bare APPROVED next to "qodo: unavailable"
  // reads as if a Qodo review backed the approval — it did not. State
  // the basis on the record: the real Qodo review still has to happen
  // on the PR. (Day 14 follow-up, ticket T-009: Qodo flagged the T-008
  // record for exactly this — qodo.available=false with verdict
  // APPROVED.)
  if (!record.qodo.available) {
    record.approvalBasis = 'local checks only (spec, plan review, code review, verify) — Qodo review did not run at factory time and is still required on the PR';
    record.qodoReviewPending = true;
  }
  record.demoArtifact = 'apps/f1-telemetry/index.html';`,
  'verdict qualification');

// ── Finding 2b: T-008 record — correct it in place, honestly ──────────
apply('evidence/runs/T-008-2026-11-20T13-30-57-066Z.json',
  `  "verdict": "APPROVED",
  "demoArtifact": "apps/f1-telemetry/index.html",`,
  `  "verdict": "APPROVED",
  "approvalBasis": "local checks only (spec, plan review, code review, verify) — Qodo review did not run at factory time and is still required on the PR",
  "qodoReviewPending": true,
  "correction": {
    "at": "2026-11-20T14:41:40Z",
    "by": "ticket T-009 (Day 14 follow-up: fix Qodo Medium findings on PR #5)",
    "reason": "Qodo review on PR #5 (20 Nov 2026) flagged this record: qodo.available=false next to a bare verdict APPROVED reads as approval resting on a Qodo review that never ran.",
    "changed": [
      "added approvalBasis stating the approval rests on local checks only",
      "added qodoReviewPending=true (the real Qodo review happens on the PR)",
      "no stage results, outputs, or the verdict value itself were altered — the verdict still records that all local gates passed"
    ]
  },
  "demoArtifact": "apps/f1-telemetry/index.html",`,
  'T-008 record correction');

console.log('t-009 change script done');
