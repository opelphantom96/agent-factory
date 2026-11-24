// Change script for ticket T-011 (Day 14 follow-up: fix the High finding
// Qodo reported on PR #5, review completed 20 Nov 2026 22:04 WIB, head
// ce9295b: "Failed reviews still appear approved" — Bug, Correctness,
// HIGH, Action required, New, src/factory/index.js lines 167-169).
// Usage: node tickets/changes/t-011-fix-qodo-high.mjs <repo-root>
// Idempotent: exits 0 without changes if every fix is already applied.
//
// Root cause, two parts, same class — the record was derived from the
// start-of-run probe instead of the actual review results:
//
// 1. Stage 7 set approvalBasis / qodoReviewPending from
//    record.qodo.available, the `qodo --version` probe taken at run
//    start. qodoReview() re-probes and then runs `qodo review <target>`;
//    that call can still fail (CLI error, timeout, wrong subcommand)
//    after a healthy probe. When it did, stages 2/4 recorded
//    qodo: {available:false, reason} but the top-level record kept no
//    approvalBasis and no qodoReviewPending, so an APPROVED verdict read
//    as Qodo-backed when neither actual Qodo review ran. The T-009 fix
//    only covered the probe-says-unavailable case.
//    Fix: derive the basis from the actual results — qodoPlan.available
//    && qodoDiff.available — naming which review failed and why. The
//    console summary line gets the same derivation (it also said
//    "reviewed" from the probe alone).
//
// 2. Stage 2 recorded the Qodo plan review's findings but never merged
//    them into the plan-review blockers (unlike stage 4, which merges
//    the Qodo diff findings). A [blocker] from Qodo's plan review was
//    ignored, so a failed plan review could still end APPROVED.
//    Fix: merge Qodo plan findings into the plan findings/blockers,
//    exactly like stage 4 does for diff findings.
//
// This change touches nothing under scripts/**.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-011-fix-qodo-high.mjs <repo-root>'); process.exit(2); }

function apply(file, oldText, newText, label) {
  const p = join(root, file);
  const src = readFileSync(p, 'utf8');
  if (src.includes(newText)) { console.log(`skip ${label}: already applied`); return false; }
  if (!src.includes(oldText)) { console.error(`FAIL ${label}: anchor not found in ${file}`); process.exit(1); }
  writeFileSync(p, src.replace(oldText, newText));
  console.log(`applied ${label} to ${file}`);
  return true;
}

// ── Fix 2: stage 2 — Qodo plan findings count like local ones ────────
apply('src/factory/index.js',
  `  const planFindings = reviewPlan(ROOT, ticket, plan);
  const qodoPlan = qodoReview({ scope: 'plan', target: ticket._file });
  const planBlockers = planFindings.filter((f) => f.severity === 'blocker');
  record.stages.planReview = {
    ok: planBlockers.length === 0, rulesChecked: rules.length,
    findings: planFindings, qodo: qodoPlan.available ? { findings: qodoPlan.findings } : { available: false, reason: qodoPlan.reason },
  };`,
  `  const planFindings = reviewPlan(ROOT, ticket, plan);
  const qodoPlan = qodoReview({ scope: 'plan', target: ticket._file });
  // Qodo's plan findings count exactly like the local ones: a blocker
  // from the Qodo plan review blocks the run, the same way a blocker
  // from the Qodo diff review blocks it at stage 4. Before this, the
  // Qodo plan findings were recorded in the stage but never evaluated,
  // so a plan review that returned a blocker could still end APPROVED.
  // (T-011: Qodo High "Failed reviews still appear approved", PR #5.)
  const allPlanFindings = qodoPlan.available
    ? [...planFindings, ...qodoPlan.findings]
    : planFindings;
  const planBlockers = allPlanFindings.filter((f) => f.severity === 'blocker');
  record.stages.planReview = {
    ok: planBlockers.length === 0, rulesChecked: rules.length,
    findings: allPlanFindings, qodo: qodoPlan.available ? { findings: qodoPlan.findings } : { available: false, reason: qodoPlan.reason },
  };`,
  'plan-review merges Qodo findings');

// ── Fix 1: stage 7 — approval basis from the actual review results ────
apply('src/factory/index.js',
  `  // The factory's APPROVED verdict covers the LOCAL gates only (spec,
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
  }`,
  `  // The factory's APPROVED verdict covers the LOCAL gates only (spec,
  // plan review, code review, verify). Whether a Qodo review actually
  // backed it must come from the ACTUAL review results — qodoPlan and
  // qodoDiff — not from the start-of-run probe (record.qodo). The probe
  // only says the CLI exists; either review call can still fail (CLI
  // error, timeout, wrong subcommand) after a healthy probe, and when
  // it does the record must say so: the real Qodo review still has to
  // happen on the PR. (Day 14 follow-up, ticket T-011: Qodo flagged
  // exactly this on PR #5 — High, "Failed reviews still appear
  // approved": approvalBasis and qodoReviewPending were set from
  // record.qodo.available, the initial probe, instead of the actual
  // plan-review and code-review results. The T-009 fix only covered the
  // probe-says-unavailable case.)
  const qodoReviewsRan = qodoPlan.available && qodoDiff.available;
  if (!qodoReviewsRan) {
    const missing = [
      ...(!qodoPlan.available ? ['plan review: ' + qodoPlan.reason] : []),
      ...(!qodoDiff.available ? ['code review: ' + qodoDiff.reason] : []),
    ].join('; ');
    record.approvalBasis = 'local checks only (spec, plan review, code review, verify) — Qodo review did not run at factory time and is still required on the PR (' + missing + ')';
    record.qodoReviewPending = true;
  }`,
  'verdict basis from actual reviews');

// ── Fix 1b: console summary — same derivation, not the probe ──────────
apply('src/factory/index.js',
  `  console.log(\`  qodo    : \${record.qodo.available ? \`reviewed (\${record.qodo.version})\` : 'unavailable — local fallback'}\`);`,
  `  console.log(\`  qodo    : \${qodoReviewsRan ? \`reviewed (\${record.qodo.version})\` : 'review did not run — local fallback'}\`);`,
  'console summary from actual reviews');

console.log('t-011 change script done');
