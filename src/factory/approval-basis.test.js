// Tests for ticket T-011 (Day 14 follow-up: Qodo High "Failed reviews
// still appear approved", PR #5, review completed 20 Nov 2026 22:04 WIB).
//
// The factory must derive approvalBasis / qodoReviewPending from the
// ACTUAL plan-review and code-review results, not from the start-of-run
// `qodo --version` probe — and a blocker from Qodo's plan review must
// block the run exactly like one from the diff review.
//
// Each test runs the real factory against a scratch copy of this repo (so
// the repo under test is never mutated), with a fake `qodo` executable on
// PATH. The scratch copy stubs scripts/verify.mjs to exit 0: the real
// verify runs `node --test`, which would re-run this very test file from
// inside the factory run (infinite recursion). The subject here is the
// approval-basis wiring, not verify — the full suite (including these
// tests) is still covered by `npm run verify` itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync,
  rmSync, cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE_DIR = dirname(process.execPath);

function makeScratchRoot() {
  const dir = mkdtempSync(join(tmpdir(), 't-011-'));
  // Minimal factory tree: the code under test + what runTicket needs.
  cpSync(join(ROOT, 'src'), join(dir, 'src'), { recursive: true });
  cpSync(join(ROOT, 'AGENTS.md'), join(dir, 'AGENTS.md'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  // Stub verify (see header): the real gate would re-run this test file.
  writeFileSync(join(dir, 'scripts', 'verify.mjs'), 'process.exit(0);\n');
  mkdirSync(join(dir, 'tickets', 'changes'), { recursive: true });
  return dir;
}

// Fake `qodo` CLI. --version always succeeds (healthy probe); the
// `review` subcommand behaves per mode:
// - 'fail-review': the review call itself fails (CLI error).
// - 'blocker': the review runs and returns one [blocker] finding.
// - 'clean': the review runs and returns one [info] finding.
function makeFakeQodo(dir, mode) {
  const bin = join(dir, 'fakebin');
  mkdirSync(bin, { recursive: true });
  const reviewBody = mode === 'fail-review'
    ? 'echo "qodo review failed (simulated CLI error)" >&2\nexit 1\n'
    : mode === 'blocker'
      ? 'echo "- [blocker] simulated Qodo failure: plan misses the acceptance criteria"\nexit 0\n'
      : 'echo "- [info] simulated Qodo review: no issues"\nexit 0\n';
  const p = join(bin, 'qodo');
  writeFileSync(p, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "qodo 0.0.0-test"; exit 0; fi\n${reviewBody}`, { mode: 0o755 });
  return bin;
}

function makeScratchTicket(dir) {
  writeFileSync(join(dir, 'tickets', 'T-011-TEST.json'), JSON.stringify({
    id: 'T-011-TEST',
    title: 'T-011 test fixture: scratch change',
    goal: 'Fixture ticket so the approval-basis tests can run the factory end to end.',
    acceptance: ['scratch change applied'],
    change: 'tickets/changes/t-011-test-change.mjs',
    files: ['scratch.txt'],
    tests: ['scratch.test.js'],
    status: 'ready',
  }, null, 2) + '\n');
  writeFileSync(join(dir, 'tickets', 'changes', 't-011-test-change.mjs'), `import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[2];
appendFileSync(join(root, 'scratch.txt'), 't-011 test change\\n');
console.log('t-011 test change applied');
`);
  writeFileSync(join(dir, 'scratch.test.js'), `import test from 'node:test';
import assert from 'node:assert/strict';
test('fixture: scratch', () => { assert.equal(1, 1); });
`);
}

// Run the factory in the scratch root. PATH is hermetic: only the fake
// qodo bin (when given) and the node binary's directory — no ambient
// `qodo` can leak in. Returns the written evidence record, the factory
// exit code, and its combined output.
function runFactory(dir, fakeBin) {
  const env = { ...process.env };
  env.PATH = fakeBin ? `${fakeBin}:${NODE_DIR}` : NODE_DIR;
  let code = 0;
  let output = '';
  try {
    output = execFileSync('node', [join(dir, 'src', 'factory', 'index.js'), 'run', '--ticket', 'T-011-TEST'], {
      cwd: dir, env, encoding: 'utf8', timeout: 120000,
    });
  } catch (e) {
    code = e.status;
    output = (e.stdout || '') + (e.stderr || '');
  }
  const runsDir = join(dir, 'evidence', 'runs');
  const files = readdirSync(runsDir).filter((f) => f.startsWith('T-011-TEST-'));
  assert.equal(files.length, 1, `exactly one evidence record should be written (factory output:\n${output})`);
  return { record: JSON.parse(readFileSync(join(runsDir, files[0]), 'utf8')), code, output };
}

test('T-011 mode A: failed Qodo review after a healthy probe must qualify the record', () => {
  const dir = makeScratchRoot();
  try {
    const fakeBin = makeFakeQodo(dir, 'fail-review');
    makeScratchTicket(dir);
    const { record, code, output } = runFactory(dir, fakeBin);
    assert.equal(code, 0, 'local gates pass, so the verdict stays APPROVED');
    assert.equal(record.verdict, 'APPROVED');
    // The probe said the CLI was available, but neither actual review ran.
    assert.equal(record.qodo.available, true, 'probe said the CLI was available');
    assert.equal(record.stages.planReview.qodo.available, false);
    assert.equal(record.stages.codeReview.qodo.available, false);
    assert.equal(record.qodoReviewPending, true, 'a failed review must leave the record pending');
    assert.match(record.approvalBasis, /local checks only/);
    assert.match(record.approvalBasis, /plan review/);
    assert.match(record.approvalBasis, /code review/);
    assert.ok(!output.includes('reviewed (qodo 0.0.0-test)'), 'console summary must not claim Qodo reviewed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-011 mode B: a blocker from Qodo plan review must block the run', () => {
  const dir = makeScratchRoot();
  try {
    const fakeBin = makeFakeQodo(dir, 'blocker');
    makeScratchTicket(dir);
    const { record, code } = runFactory(dir, fakeBin);
    assert.equal(code, 1, 'a Qodo plan blocker escalates the run');
    assert.equal(record.verdict, 'ESCALATED');
    assert.equal(record.stages.planReview.ok, false, 'plan review stage must fail');
    const blocker = record.stages.planReview.findings.find(
      (f) => f.severity === 'blocker' && f.type === 'qodo',
    );
    assert.ok(blocker, 'the Qodo plan blocker must be in the plan findings');
    assert.match(blocker.message, /plan misses the acceptance criteria/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-011 control: when both Qodo reviews actually run, no pending flag', () => {
  const dir = makeScratchRoot();
  try {
    const fakeBin = makeFakeQodo(dir, 'clean');
    makeScratchTicket(dir);
    const { record, code, output } = runFactory(dir, fakeBin);
    assert.equal(code, 0);
    assert.equal(record.verdict, 'APPROVED');
    assert.equal(record.qodo.available, true);
    assert.equal(record.stages.planReview.qodo.findings[0].severity, 'info');
    assert.equal(record.approvalBasis, undefined, 'a real Qodo review backed this run — no local-only basis');
    assert.equal(record.qodoReviewPending, undefined);
    assert.ok(output.includes('reviewed (qodo 0.0.0-test)'), 'console summary may claim Qodo reviewed');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-011 control: Qodo CLI absent still qualifies the record (T-009 behaviour)', () => {
  const dir = makeScratchRoot();
  try {
    makeScratchTicket(dir);
    const { record, code } = runFactory(dir, null);
    assert.equal(code, 0);
    assert.equal(record.verdict, 'APPROVED');
    assert.equal(record.qodo.available, false);
    assert.equal(record.qodoReviewPending, true);
    assert.match(record.approvalBasis, /local checks only/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
