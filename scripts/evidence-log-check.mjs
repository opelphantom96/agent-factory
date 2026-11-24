// Evidence-log completeness check — AGENTS.md rule 4.
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
const RUN_NAME = /^T-\d{3}-\d{4}-\d{2}-\d{2}T.*\.json$/;
const TICKET_ID = /^T-\d{3}$/;

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
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log('report: ' + out);
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
