// Change script for ticket T-006 (Day 13: evidence-log-check skill).
// Usage: node tickets/changes/t-006-evidence-log-check.mjs <repo-root>
// Idempotent: exits 0 without changes if all three files already exist
// with identical content.
//
// Writes the Day 13 skill (skills/evidence-log-check/SKILL.md), the
// deterministic checker it invokes (scripts/evidence-log-check.mjs), and
// the checker's tests (scripts/evidence-log-check.test.js). The skill
// follows the SKILL.md frontmatter format (name + description) used by
// compatible coding agents, so another agent can load the same procedure.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-006-evidence-log-check.mjs <repo-root>'); process.exit(2); }

const SKILL = `---
name: evidence-log-check
description: |
  Verify the factory evidence log is complete after a run, or before sharing
  evidence: every pipeline stage left a trace in evidence/runs/ and
  evidence/EVIDENCE.md mentions every run. Use after any factory run, before
  a Discussion submission, or whenever the log may have drifted from the
  records. Runs the deterministic checker in scripts/evidence-log-check.mjs
  and reports PASS/FAIL per run record.
license: MIT
metadata:
  version: "1.0.0"
  source: Agent Factory, Day 13 (Qodo Hackathon 2026) — written for this repo
  safety: VERIFIED 2026-11-18 — instruction-only skill plus a zero-dependency Node checker that only reads evidence/runs/, tickets/ and evidence/EVIDENCE.md and writes one report JSON; it never edits, deletes or "repairs" a run record.
---

# Evidence log check

AGENTS.md rule 4: every pipeline stage writes its result to the evidence log
(\`evidence/runs/\`). A stage that ran but left no trace did not run — and a
hand-maintained log (\`evidence/EVIDENCE.md\`) can drift from the records.
This skill proves the log is complete. It checks, it does not fix: a run
record is append-only history. Never edit a record to make the check pass.

## Required inputs

- The repository root. Default: the directory you are working in when you
  invoke this skill (the repo root).
- \`evidence/runs/\` — the directory of per-run JSON records. Must exist.
- \`evidence/EVIDENCE.md\` — the hand-maintained log. Must exist.
- Optional: \`--out <path>\` for the saved check report. Default:
  \`evidence/runs/evidence-log-check-<UTC timestamp>.json\`.

## Context you must read first

- \`AGENTS.md\` rule 4 (evidence) and rule 5 (a gate that fails twice
  escalates to a human).
- \`src/factory/evidence.js\` — how a run record is written: the filename is
  \`<TICKET>-<ISO timestamp>.json\` with \`:\` and \`.\` replaced by \`-\`.
- A run record has this shape (from \`src/factory/index.js\`): \`ticket\`,
  \`startedAt\`, \`finishedAt\`, \`qodo\`, \`stages\` with \`spec\`,
  \`planReview\`, \`implement\`, \`codeReview\`, \`autoFix\`, \`verify\`,
  plus \`verdict\` (\`APPROVED\` or \`ESCALATED\`) and \`demoArtifact\`.
  Two stages do NOT record \`ok\` the way the others do, and the checker
  knows it — do not "fix" the checker to demand \`ok\` everywhere:
  \`autoFix\` records \`{ fixed, remaining }\` (it succeeded when
  \`remaining\` is empty), and \`codeReview\` records the pre-fix \`ok\`,
  superseded by \`afterFix.findings\` when the auto-fix re-reviewed
  (T-004: pre-fix \`ok: false\`, post-fix findings clean, verdict
  APPROVED — that is consistent, not a failure).
- \`evidence/runs/\` also holds other evidence JSON (for example
  \`day-11-review-comparison.json\`). Those are NOT run records: they have no
  \`stages\` object and no \`verdict\`. The checker classifies them as
  \`other\` and skips them — do not fail them for missing stages.

## Steps

1. Confirm the inputs exist: \`evidence/runs/\` is a directory and
   \`evidence/EVIDENCE.md\` is a file under the repo root. If either is
   missing, stop and name the missing path.
2. Confirm the checker exists: \`scripts/evidence-log-check.mjs\`. If it is
   missing, stop and report "checker script missing" — do not reimplement
   the check inline.
3. Run the check from the repo root:
   \`node scripts/evidence-log-check.mjs [root] [--out <path>]\`
   \`[root]\` is optional — it defaults to the repo root, so running
   \`node scripts/evidence-log-check.mjs\` with no arguments checks this
   repo. \`[--out <path>]\` is optional too; without it the report goes to
   the default path under \`evidence/runs/\`.
   Keep the full stdout and the exit code. Exit 0 means every check passed;
   exit 1 means at least one check failed; exit 2 means the check itself
   could not run (missing input or unreadable file).
4. Read the saved report JSON (the path is printed on the last line of
   stdout). For each record, confirm the six per-record checks, plus the
   \`ticket-has-run\` cross-check:
   - \`stages-present\` — all six stages (\`spec\`, \`planReview\`,
     \`implement\`, \`codeReview\`, \`autoFix\`, \`verify\`) are present.
   - \`timestamps\` — \`startedAt\` and \`finishedAt\` are valid ISO dates
     and \`finishedAt\` is not before \`startedAt\`.
   - \`verdict-valid\` — \`verdict\` is \`APPROVED\` or \`ESCALATED\`.
   - \`verdict-consistent\` — \`APPROVED\` only when every stage succeeded;
     \`ESCALATED\` only when at least one stage did not. "Succeeded" is
     schema-specific: \`autoFix\` succeeds when \`remaining\` is empty (it
     records no \`ok\`); \`codeReview\` succeeds when \`ok\` is true, or when
     \`afterFix.findings\` has no blocker; every other stage succeeds when
     \`ok\` is true.
   - \`filename-matches-ticket\` — the filename starts with the record's
     ticket id and the record's \`ticket\` field matches it.
   - \`logged-in-evidence-md\` — \`evidence/EVIDENCE.md\` mentions the
     ticket id.
   - \`ticket-has-run\` (cross-check) — every ticket file in \`tickets/\`
     with status \`done\` or \`escalated\` has a run record.
5. Report the result, in this order:
   - the verdict line: \`EVIDENCE LOG: PASS (N records, 0 failures)\` or
     \`EVIDENCE LOG: FAIL (N failures)\` — copy the checker's verdict line
     verbatim, do not reword it;
   - every failing record: file, check id, and the detail the checker
     printed;
   - the \`other\` files the checker skipped, by name, so the reader knows
     they were seen and deliberately not failed;
   - the path of the saved report JSON.
6. If the result is FAIL, do not edit any run record. The fix is one of:
   the log (\`evidence/EVIDENCE.md\`) is missing a mention — add it; the
   recorder (\`src/factory/evidence.js\` or \`src/factory/index.js\`) is not
   writing a stage — fix the recorder and re-run the factory ticket; the
   record itself is corrupt — escalate to a human. After the fix, re-run
   step 3 and report the new verdict line.

## Expected results

- A healthy log prints \`EVIDENCE LOG: PASS\` and exit code 0, with one
  report JSON saved under \`evidence/runs/\`.
- A failing log prints \`EVIDENCE LOG: FAIL\`, exit code 1, and names every
  failing check. That is a correct outcome, not a broken check: report it
  and follow step 6.

## Evidence to save

- The check report JSON (path printed by the checker). Keep it in
  \`evidence/runs/\` — the next run classifies it as \`other\` and skips it.
- The exact command you ran and its exit code, in the evidence record for
  the work that invoked the check.

## Stop and ask for input when

- \`evidence/runs/\` or \`evidence/EVIDENCE.md\` is missing. Name the missing
  path and stop.
- \`scripts/evidence-log-check.mjs\` is missing. Report it and stop; do not
  write your own version of the check on the spot.
- The checker exits 2 (it could not run). Report its stderr and stop.
- A check fails and you do not know which fix applies. Report the failing
  checks and stop; do not guess a fix, and never edit a run record.

## Never

- Edit, delete, or "repair" a run record in \`evidence/runs/\` to make the
  check pass. Records are append-only history.
- Weaken a check, skip a record, or report PASS when the checker said FAIL.
- Treat a file in \`evidence/runs/\` that is not a run record as a failed run
  record. Classify first, then check.
`;

const CHECKER = `// Evidence-log completeness check — AGENTS.md rule 4.
//
// Verifies every factory run left a complete trace in evidence/runs/ and
// that evidence/EVIDENCE.md mentions every run. Run records are append-only
// history: this check reports gaps, it never edits a record.
//
// Usage:
//   node scripts/evidence-log-check.mjs [root] [--out <path>]
//
// Exit codes: 0 = every check passed; 1 = at least one check failed;
// 2 = the check itself could not run (missing input or unreadable file).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGES = ['spec', 'planReview', 'implement', 'codeReview', 'autoFix', 'verify'];
const RUN_NAME = /^T-\\d{3}-\\d{4}-\\d{2}-\\d{2}T.*\\.json$/;
const TICKET_ID = /^T-\\d{3}$/;

function check(id, ok, detail) {
  return { id, ok, detail };
}

// Stage success is schema-specific (see src/factory/index.js): autoFix
// records { fixed, remaining } with no ok field — it succeeded when
// nothing remains; codeReview records the pre-fix ok, superseded by
// afterFix.findings when the auto-fix re-reviewed. Every other stage
// records ok directly.
function stageSucceeded(name, stage) {
  if (!stage || typeof stage !== 'object') return false;
  if (name === 'autoFix') return Array.isArray(stage.remaining) && stage.remaining.length === 0;
  if (name === 'codeReview' && stage.afterFix && Array.isArray(stage.afterFix.findings)) {
    return !stage.afterFix.findings.some(function (f) { return f.severity === 'blocker'; });
  }
  return stage.ok === true;
}

/** Classify one evidence file: 'run' (a factory run record), 'other'
 *  (other evidence JSON — skipped, checked for nothing), or
 *  'unparseable' (not valid JSON). */
export function classifyFile(name, parsed) {
  if (parsed === null) return 'unparseable';
  if (RUN_NAME.test(name)) return 'run';
  return 'other';
}

/** Check one factory run record. Returns { file, ticket, checks, ok }. */
export function checkRunRecord(record, filename, evidenceMd) {
  const checks = [];
  const stages = record.stages && typeof record.stages === 'object' ? record.stages : null;

  const missing = stages ? STAGES.filter(function (s) { return !Object.hasOwn(stages, s); }) : STAGES.slice();
  checks.push(check('stages-present', missing.length === 0,
    missing.length === 0 ? 'all six stages present' : 'missing stages: ' + missing.join(', ')));

  const start = Date.parse(record.startedAt || '');
  const end = Date.parse(record.finishedAt || '');
  const tsOk = Number.isFinite(start) && Number.isFinite(end) && end >= start;
  checks.push(check('timestamps', tsOk,
    tsOk ? 'startedAt ' + record.startedAt + ', finishedAt ' + record.finishedAt
      : 'startedAt=' + String(record.startedAt) + ' finishedAt=' + String(record.finishedAt)));

  const verdictOk = record.verdict === 'APPROVED' || record.verdict === 'ESCALATED';
  checks.push(check('verdict-valid', verdictOk, 'verdict=' + String(record.verdict)));

  let consistent = false;
  let consistentDetail = '';
  if (!stages) {
    consistentDetail = 'no stages object to compare with the verdict';
  } else if (record.verdict === 'APPROVED') {
    const bad = STAGES.filter(function (s) { return !stageSucceeded(s, stages[s]); });
    consistent = bad.length === 0;
    consistentDetail = consistent ? 'APPROVED and every stage succeeded' : 'APPROVED but not-ok stages: ' + bad.join(', ');
  } else if (record.verdict === 'ESCALATED') {
    const bad = STAGES.filter(function (s) { return !stageSucceeded(s, stages[s]); });
    consistent = bad.length > 0;
    consistentDetail = consistent ? 'ESCALATED with failing stages: ' + bad.join(', ') : 'ESCALATED but every stage succeeded';
  } else {
    consistentDetail = 'verdict is neither APPROVED nor ESCALATED';
  }
  checks.push(check('verdict-consistent', consistent, consistentDetail));

  const ticketOk = typeof record.ticket === 'string' && TICKET_ID.test(record.ticket)
    && filename.indexOf(record.ticket + '-') === 0;
  checks.push(check('filename-matches-ticket', ticketOk,
    ticketOk ? 'filename starts with ' + record.ticket : 'filename=' + filename + ' ticket=' + String(record.ticket)));

  const loggedOk = typeof record.ticket === 'string' && evidenceMd.indexOf(record.ticket) !== -1;
  checks.push(check('logged-in-evidence-md', loggedOk,
    loggedOk ? 'evidence/EVIDENCE.md mentions ' + record.ticket : 'evidence/EVIDENCE.md does not mention ' + String(record.ticket)));

  return { file: filename, ticket: typeof record.ticket === 'string' ? record.ticket : null, checks, ok: checks.every(function (c) { return c.ok; }) };
}

/** Run the whole check against a repo root. Returns the report object. */
export function checkEvidenceLog(root) {
  const runsDir = join(root, 'evidence', 'runs');
  const evidenceMdPath = join(root, 'evidence', 'EVIDENCE.md');
  const ticketsDir = join(root, 'tickets');
  if (!existsSync(runsDir)) throw new Error('evidence/runs/ not found under ' + root);
  if (!existsSync(evidenceMdPath)) throw new Error('evidence/EVIDENCE.md not found under ' + root);

  const evidenceMd = readFileSync(evidenceMdPath, 'utf8');
  const report = {
    checkedAt: new Date().toISOString(),
    root,
    records: [],
    otherFiles: [],
    unparseable: [],
    ticketsWithoutRun: [],
    summary: { runRecords: 0, otherFiles: 0, failures: 0 },
    verdict: 'PASS',
  };

  const runTickets = new Set();
  for (const name of readdirSync(runsDir).sort()) {
    if (!name.endsWith('.json')) continue;
    let parsed = null;
    let parseFailed = false;
    try {
      parsed = JSON.parse(readFileSync(join(runsDir, name), 'utf8'));
    } catch (e) {
      parseFailed = true;
    }
    const kind = parseFailed ? 'unparseable' : classifyFile(name, parsed);
    if (kind === 'run') {
      const result = checkRunRecord(parsed, name, evidenceMd);
      report.records.push(result);
      runTickets.add(result.ticket);
      report.summary.runRecords += 1;
      report.summary.failures += result.checks.filter(function (c) { return !c.ok; }).length;
    } else if (kind === 'other') {
      report.otherFiles.push(name);
      report.summary.otherFiles += 1;
    } else {
      report.unparseable.push({ file: name, checks: [check('parseable', false, 'not valid JSON')] });
      report.summary.failures += 1;
    }
  }

  if (existsSync(ticketsDir)) {
    for (const name of readdirSync(ticketsDir).filter(function (f) { return f.endsWith('.json'); }).sort()) {
      let ticket = null;
      try { ticket = JSON.parse(readFileSync(join(ticketsDir, name), 'utf8')); } catch (e) { continue; }
      if (ticket && (ticket.status === 'done' || ticket.status === 'escalated') && !runTickets.has(ticket.id)) {
        report.ticketsWithoutRun.push({ id: ticket.id, checks: [check('ticket-has-run', false, 'ticket ' + ticket.id + ' is ' + ticket.status + ' but has no run record')] });
        report.summary.failures += 1;
      }
    }
  }

  if (report.summary.failures > 0) report.verdict = 'FAIL';
  return report;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** The verdict line, copied verbatim by the skill's report step. */
export function verdictLine(report) {
  if (report.verdict === 'PASS') {
    return 'EVIDENCE LOG: PASS (' + report.summary.runRecords + ' records, 0 failures)';
  }
  const n = report.summary.failures;
  return 'EVIDENCE LOG: FAIL (' + n + (n === 1 ? ' failure)' : ' failures)');
}

function main() {
  const args = process.argv.slice(2);
  let root = null;
  let out = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') { out = args[i + 1]; i++; }
    else if (args[i].indexOf('--') !== 0) { root = args[i]; }
    else { console.error('unknown option: ' + args[i]); process.exit(2); }
  }
  if (!root) root = join(dirname(fileURLToPath(import.meta.url)), '..');
  if (!out) out = join(root, 'evidence', 'runs', 'evidence-log-check-' + stamp() + '.json');

  let report;
  try {
    report = checkEvidenceLog(root);
  } catch (e) {
    console.error('evidence-log-check: ' + e.message);
    process.exit(2);
  }

  for (const r of report.records) {
    console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + r.file + ' (' + r.ticket + ')');
    for (const c of r.checks) {
      if (!c.ok) console.log('  FAIL ' + c.id + ': ' + c.detail);
    }
  }
  for (const u of report.unparseable) console.log('FAIL ' + u.file + ' (unparseable JSON)');
  for (const t of report.ticketsWithoutRun) console.log('FAIL ticket ' + t.id + ': no run record');
  if (report.otherFiles.length > 0) console.log('skipped (other evidence, not run records): ' + report.otherFiles.join(', '));

  console.log(verdictLine(report));

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2) + '\\n');
  console.log('report: ' + out);
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
`;

const TEST = `// Tests for scripts/evidence-log-check.mjs — AGENTS.md rule 1: every
// change ships with a test that fails before the change and passes after.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkRunRecord, checkEvidenceLog, classifyFile, verdictLine } from './evidence-log-check.mjs';

function validRecord(ticket) {
  return {
    ticket,
    startedAt: '2026-11-14T11:20:36.333Z',
    finishedAt: '2026-11-14T11:21:00.000Z',
    qodo: { available: false, reason: 'local fallback' },
    stages: {
      spec: { ok: true },
      planReview: { ok: true },
      implement: { ok: true },
      codeReview: { ok: true },
      // autoFix records { fixed, remaining } with no ok field — it
      // succeeded when remaining is empty (real schema, see T-001..T-005).
      autoFix: { fixed: [], remaining: [] },
      verify: { ok: true },
    },
    verdict: 'APPROVED',
    demoArtifact: 'apps/f1-telemetry/index.html',
  };
}

function findCheck(result, id) {
  return result.checks.find(function (c) { return c.id === id; });
}

function makeFixture(records, tickets, evidenceMd) {
  const root = mkdtempSync(join(tmpdir(), 'evidence-log-check-'));
  mkdirSync(join(root, 'evidence', 'runs'), { recursive: true });
  mkdirSync(join(root, 'tickets'), { recursive: true });
  for (const name of Object.keys(records)) {
    const value = records[name];
    writeFileSync(join(root, 'evidence', 'runs', name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }
  for (const t of tickets) {
    writeFileSync(join(root, 'tickets', t.id + '.json'), JSON.stringify(t, null, 2));
  }
  writeFileSync(join(root, 'evidence', 'EVIDENCE.md'), evidenceMd);
  return root;
}

test('valid run record passes every check', function () {
  const result = checkRunRecord(validRecord('T-001'), 'T-001-2026-11-14T11-20-36-333Z.json', 'log mentions T-001');
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 6);
  for (const c of result.checks) assert.equal(c.ok, true, c.id);
});

test('missing stage fails stages-present and verdict-consistent', function () {
  const record = validRecord('T-001');
  delete record.stages.verify;
  const result = checkRunRecord(record, 'T-001-2026-11-14T11-20-36-333Z.json', 'log mentions T-001');
  assert.equal(result.ok, false);
  assert.equal(findCheck(result, 'stages-present').ok, false);
  assert.equal(findCheck(result, 'verdict-consistent').ok, false);
  assert.equal(findCheck(result, 'timestamps').ok, true);
  assert.equal(findCheck(result, 'verdict-valid').ok, true);
});

test('auto-fix success (T-004 shape) is consistent with APPROVED', function () {
  const record = validRecord('T-004');
  record.stages.codeReview = { ok: false, afterFix: { findings: [{ severity: 'info', type: 'diff-ok', message: '2 file(s) changed, no blocking findings' }] } };
  record.stages.autoFix = { fixed: [{ type: 'missing-test', fix: 'generated smoke test src/demo/topspeed.test.js' }], remaining: [] };
  const result = checkRunRecord(record, 'T-004-2026-11-14T11-21-06-213Z.json', 'log mentions T-004');
  assert.equal(findCheck(result, 'verdict-consistent').ok, true);
  assert.equal(result.ok, true);
});

test('auto-fix with remaining findings fails verdict-consistent', function () {
  const record = validRecord('T-001');
  record.stages.autoFix = { fixed: [], remaining: ['missing-test'] };
  const result = checkRunRecord(record, 'T-001-2026-11-14T11-20-36-333Z.json', 'log mentions T-001');
  assert.equal(findCheck(result, 'verdict-consistent').ok, false);
});

test('APPROVED with a failing stage fails verdict-consistent', function () {
  const record = validRecord('T-001');
  record.stages.codeReview = { ok: false };
  const result = checkRunRecord(record, 'T-001-2026-11-14T11-20-36-333Z.json', 'log mentions T-001');
  assert.equal(findCheck(result, 'verdict-consistent').ok, false);
  assert.equal(findCheck(result, 'stages-present').ok, true);
});

test('ESCALATED with a failing stage is consistent', function () {
  const record = validRecord('T-001');
  record.verdict = 'ESCALATED';
  record.stages.verify = { ok: false };
  const result = checkRunRecord(record, 'T-001-2026-11-14T11-20-36-333Z.json', 'log mentions T-001');
  assert.equal(findCheck(result, 'verdict-consistent').ok, true);
  assert.equal(result.ok, true);
});

test('filename and ticket mismatch fails', function () {
  const result = checkRunRecord(validRecord('T-001'), 'T-002-2026-11-14T11-20-40-188Z.json', 'log mentions T-001 and T-002');
  assert.equal(findCheck(result, 'filename-matches-ticket').ok, false);
});

test('ticket missing from EVIDENCE.md fails logged-in-evidence-md', function () {
  const result = checkRunRecord(validRecord('T-001'), 'T-001-2026-11-14T11-20-36-333Z.json', 'log mentions nothing');
  assert.equal(findCheck(result, 'logged-in-evidence-md').ok, false);
});

test('day-11-style record is other evidence, not a failed run', function () {
  assert.equal(classifyFile('day-11-review-comparison.json', { comparison: 'before/after' }), 'other');
  assert.equal(classifyFile('T-001-2026-11-14T11-20-36-333Z.json', validRecord('T-001')), 'run');
  assert.equal(classifyFile('day-12-ticket-source-check.json', null), 'unparseable');
});

test('checkEvidenceLog passes on a healthy fixture', function () {
  const root = makeFixture(
    {
      'T-001-2026-11-14T11-20-36-333Z.json': validRecord('T-001'),
      'T-002-2026-11-14T11-20-40-188Z.json': validRecord('T-002'),
      'day-11-review-comparison.json': { comparison: 'before/after' },
    },
    [{ id: 'T-001', status: 'done' }, { id: 'T-002', status: 'done' }],
    'log mentions T-001 and T-002',
  );
  const report = checkEvidenceLog(root);
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.summary.runRecords, 2);
  assert.equal(report.summary.otherFiles, 1);
  assert.equal(report.summary.failures, 0);
});

test('checkEvidenceLog fails on a missing stage (two checks) and on unparseable JSON', function () {
  const broken = validRecord('T-001');
  delete broken.stages.autoFix;
  const root = makeFixture(
    {
      'T-001-2026-11-14T11-20-36-333Z.json': broken,
      'broken.json': '{not json',
    },
    [{ id: 'T-001', status: 'done' }],
    'log mentions T-001',
  );
  const report = checkEvidenceLog(root);
  assert.equal(report.verdict, 'FAIL');
  // A missing stage fails stages-present AND verdict-consistent (APPROVED
  // cannot hold when a stage is absent), plus 1 for the unparseable file.
  assert.equal(report.summary.failures, 3);
  assert.equal(report.unparseable.length, 1);
});

test('ticket with no run record is reported', function () {
  const root = makeFixture(
    { 'T-001-2026-11-14T11-20-36-333Z.json': validRecord('T-001') },
    [{ id: 'T-001', status: 'done' }, { id: 'T-009', status: 'done' }],
    'log mentions T-001 and T-009',
  );
  const report = checkEvidenceLog(root);
  assert.equal(report.verdict, 'FAIL');
  assert.equal(report.ticketsWithoutRun.length, 1);
  assert.equal(report.ticketsWithoutRun[0].id, 'T-009');
});

test('missing runs directory throws', function () {
  const root = mkdtempSync(join(tmpdir(), 'evidence-log-check-'));
  assert.throws(function () { checkEvidenceLog(root); }, /evidence\\/runs\\//);
});

test('verdict line uses the singular for one failure', function () {
  assert.equal(verdictLine({ verdict: 'FAIL', summary: { runRecords: 6, failures: 1 } }), 'EVIDENCE LOG: FAIL (1 failure)');
  assert.equal(verdictLine({ verdict: 'FAIL', summary: { runRecords: 6, failures: 5 } }), 'EVIDENCE LOG: FAIL (5 failures)');
});

test('verdict line for a pass names the record count', function () {
  assert.equal(verdictLine({ verdict: 'PASS', summary: { runRecords: 6, failures: 0 } }), 'EVIDENCE LOG: PASS (6 records, 0 failures)');
});
`;

const FILES = [
  ['skills/evidence-log-check/SKILL.md', SKILL],
  ['scripts/evidence-log-check.mjs', CHECKER],
  ['scripts/evidence-log-check.test.js', TEST],
];

let wrote = 0;
for (const [rel, content] of FILES) {
  const target = join(root, rel);
  const dir = join(root, dirname(rel));
  if (existsSync(target) && readFileSync(target, 'utf8') === content) {
    console.log('unchanged: ' + rel);
  } else {
    mkdirSync(dir, { recursive: true });
    writeFileSync(target, content);
    console.log('wrote ' + rel);
    wrote++;
  }
}
console.log(wrote === 0
  ? 'all three files already present with identical content'
  : 'wrote ' + wrote + ' file(s) (Day 13 evidence-log-check skill)');
