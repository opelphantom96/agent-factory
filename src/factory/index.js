// Agent Factory CLI — the pipeline orchestrator.
//
// Usage:
//   node src/factory/index.js run --ticket T-001
//   node src/factory/index.js list
//
// Pipeline: spec → plan review → implement → code review → auto-fix →
// verify → approve / escalate. Every stage writes to the evidence record.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTicket, validateTicket, listTickets } from './tickets.js';
import { detectQodo, qodoReview } from './qodo.js';
import { loadAgentRules, reviewPlan, reviewDiff } from './review.js';
import { resolveFindings } from './fixer.js';
import { recordRun } from './evidence.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function log(stage, msg) {
  console.log(`[${stage}] ${msg}`);
}

function snapshotFiles(root, files) {
  const snap = new Map();
  for (const f of files) {
    const p = join(root, f);
    snap.set(f, existsSync(p) ? readFileSync(p, 'utf8') : null);
  }
  return snap;
}

function diffSnapshots(before, after) {
  const changes = [];
  for (const [file, afterContent] of after) {
    const beforeContent = before.get(file);
    if (beforeContent !== afterContent) {
      changes.push({ file, before: beforeContent, after: afterContent });
    }
  }
  return changes;
}

function runCommand(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 120000, ...opts });
    return { ok: true, output: String(out) };
  } catch (e) {
    return { ok: false, output: (e.stdout ? String(e.stdout) : '') + (e.stderr ? String(e.stderr) : e.message) };
  }
}

function buildPlan(ticket) {
  return {
    steps: [
      `Read change script ${ticket.change}`,
      `Apply change to ${(ticket.files || []).join(', ')}`,
      `Add/verify tests: ${(ticket.tests || []).join(', ')}`,
      'Run full verification (tests + syntax + demo rebuild)',
      'Rebuild demo dashboard',
    ],
  };
}

export function runTicket(ticketId) {
  const startedAt = new Date().toISOString();
  const record = { ticket: ticketId, startedAt, qodo: detectQodo(), stages: {}, verdict: null };
  const blockers = [];

  // ── 1. spec ──────────────────────────────────────────────────────────
  log('spec', `loading ticket ${ticketId}`);
  const { ticket, errors } = loadTicket(ROOT, ticketId);
  if (!ticket) {
    record.stages.spec = { ok: false, errors };
    record.verdict = 'ESCALATED';
    record.finishedAt = new Date().toISOString();
    recordRun(ROOT, record);
    console.log(`ESCALATED: ${errors.join('; ')}`);
    return 1;
  }
  const specErrors = validateTicket(ROOT, ticket);
  record.stages.spec = { ok: specErrors.length === 0, errors: specErrors, title: ticket.title };
  if (specErrors.length > 0) blockers.push(...specErrors.map((e) => ({ severity: 'blocker', type: 'spec', message: e })));
  log('spec', specErrors.length === 0 ? `ticket OK: ${ticket.title}` : `errors: ${specErrors.join('; ')}`);

  // ── 2. plan review ───────────────────────────────────────────────────
  const rules = loadAgentRules(ROOT);
  const plan = buildPlan(ticket);
  const planFindings = reviewPlan(ROOT, ticket, plan);
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
  };
  log('plan-review', `${planFindings.length} finding(s), ${planBlockers.length} blocker(s); qodo: ${qodoPlan.available ? 'reviewed' : 'unavailable — local fallback'}`);
  blockers.push(...planBlockers);

  // ── 3. implement ─────────────────────────────────────────────────────
  const watched = [...new Set([...(ticket.files || []), ...(ticket.tests || [])])];
  const before = snapshotFiles(ROOT, watched);
  log('implement', `running change script ${ticket.change}`);
  const impl = runCommand('node', [join(ROOT, ticket.change), ROOT]);
  const after = snapshotFiles(ROOT, watched);
  const changes = diffSnapshots(before, after);
  record.stages.implement = {
    ok: impl.ok && changes.length > 0,
    changeScript: ticket.change,
    changedFiles: changes.map((c) => c.file),
    output: impl.output.slice(0, 2000),
  };
  log('implement', impl.ok ? `changed ${changes.length} file(s): ${changes.map((c) => c.file).join(', ')}` : `change script FAILED: ${impl.output.slice(0, 300)}`);
  if (!impl.ok) blockers.push({ severity: 'blocker', type: 'implement-failed', message: impl.output.slice(0, 300) });
  if (changes.length === 0) blockers.push({ severity: 'blocker', type: 'no-change', message: 'change script changed no files' });

  // ── 4. code review ───────────────────────────────────────────────────
  // Day 11 decision (KEEP): the factory reviews with the customized
  // profile (review/review-config.json) by default.
  let reviewFindings = reviewDiff(ROOT, changes, ticket, { profile: 'custom' });
  const qodoDiff = qodoReview({ scope: 'diff', target: changes[0] ? join(ROOT, changes[0].file) : ticket._file });
  if (qodoDiff.available) reviewFindings = [...reviewFindings, ...qodoDiff.findings];
  let reviewBlockers = reviewFindings.filter((f) => f.severity === 'blocker');
  record.stages.codeReview = {
    ok: reviewBlockers.length === 0, findings: reviewFindings,
    qodo: qodoDiff.available ? { findings: qodoDiff.findings } : { available: false, reason: qodoDiff.reason },
  };
  log('code-review', `${reviewFindings.length} finding(s), ${reviewBlockers.length} blocker(s)`);

  // ── 5. auto-fix (PR Resolver) ────────────────────────────────────────
  let fixed = [];
  if (reviewBlockers.length > 0) {
    const res = resolveFindings(ROOT, reviewBlockers, ticket);
    fixed = res.fixed;
    if (res.fixed.length > 0) {
      log('auto-fix', `applied ${res.fixed.length} fix(es): ${res.fixed.map((f) => f.fix).join('; ')}`);
      // Re-review after fixes.
      const afterFix = snapshotFiles(ROOT, watched);
      const changesAfterFix = diffSnapshots(before, afterFix);
      reviewFindings = reviewDiff(ROOT, changesAfterFix, ticket, { profile: 'custom' });
      reviewBlockers = reviewFindings.filter((f) => f.severity === 'blocker');
      record.stages.codeReview.afterFix = { findings: reviewFindings };
    }
    record.stages.autoFix = { fixed: res.fixed.map((f) => ({ type: f.type, fix: f.fix })), remaining: res.remaining.map((f) => f.type) };
    blockers.push(...res.remaining);
  } else {
    record.stages.autoFix = { fixed: [], remaining: [] };
  }

  // ── 6. verify ────────────────────────────────────────────────────────
  const verify = runCommand('node', ['scripts/verify.mjs']);
  record.stages.verify = { ok: verify.ok, output: verify.output.slice(0, 3000) };
  log('verify', verify.ok ? 'all gates green' : `FAILED:\n${verify.output.slice(0, 500)}`);
  if (!verify.ok) blockers.push({ severity: 'blocker', type: 'verify-failed', message: verify.output.slice(0, 300) });

  // ── 7. approve / escalate ────────────────────────────────────────────
  const unresolved = blockers.filter((b) => b.severity === 'blocker');
  record.verdict = unresolved.length === 0 ? 'APPROVED' : 'ESCALATED';
  // The factory's APPROVED verdict covers the LOCAL gates only (spec,
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
  }
  record.demoArtifact = 'apps/f1-telemetry/index.html';
  record.finishedAt = new Date().toISOString();
  const evidenceFile = recordRun(ROOT, record);

  // The factory owns the ticket lifecycle: mark it done / escalated.
  try {
    const updated = { ...ticket, status: record.verdict === 'APPROVED' ? 'done' : 'escalated' };
    delete updated._file;
    writeFileSync(ticket._file, JSON.stringify(updated, null, 2) + '\n');
  } catch { /* ticket file update is best-effort; the evidence record stands */ }

  console.log('\n' + '='.repeat(60));
  console.log(`Ticket ${ticketId}: ${record.verdict}`);
  console.log(`  title   : ${ticket.title}`);
  console.log(`  qodo    : ${qodoReviewsRan ? `reviewed (${record.qodo.version})` : 'review did not run — local fallback'}`);
  console.log(`  fixed   : ${fixed.length} finding(s) auto-fixed`);
  console.log(`  evidence: ${evidenceFile}`);
  console.log('='.repeat(60));
  return record.verdict === 'APPROVED' ? 0 : 1;
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'run') {
    const i = rest.indexOf('--ticket');
    const id = i >= 0 ? rest[i + 1] : null;
    if (!id) { console.error('usage: node src/factory/index.js run --ticket <ID>'); process.exit(2); }
    process.exit(runTicket(id));
  }
  if (cmd === 'list') {
    for (const t of listTickets(ROOT)) console.log(`${t.id}\t${t.status}\t${t.title}`);
    process.exit(0);
  }
  console.error('usage: node src/factory/index.js <run --ticket <ID> | list>');
  process.exit(2);
}

main();
