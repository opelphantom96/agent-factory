// Tests for scripts/evidence-log-check.mjs — AGENTS.md rule 1: every
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
  assert.throws(function () { checkEvidenceLog(root); }, /evidence\/runs\//);
});

test('verdict line uses the singular for one failure', function () {
  assert.equal(verdictLine({ verdict: 'FAIL', summary: { runRecords: 6, failures: 1 } }), 'EVIDENCE LOG: FAIL (1 failure)');
  assert.equal(verdictLine({ verdict: 'FAIL', summary: { runRecords: 6, failures: 5 } }), 'EVIDENCE LOG: FAIL (5 failures)');
});

test('verdict line for a pass names the record count', function () {
  assert.equal(verdictLine({ verdict: 'PASS', summary: { runRecords: 6, failures: 0 } }), 'EVIDENCE LOG: PASS (6 records, 0 failures)');
});
