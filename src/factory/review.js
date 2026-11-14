// Local rule-based reviewer — plan review + code review.
//
// This is the fallback reviewer that runs when Qodo is unavailable. It
// enforces the rules in AGENTS.md mechanically, so the factory never ships
// a change with zero review. When Qodo is available, its findings are merged
// with these (see qodo.js).
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{8,}/, /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/, /ghp_[a-zA-Z0-9]{20,}/,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/,
];

const FORBIDDEN_IN_DIFF = [
  { pattern: /\beval\s*\(/, type: 'eval-call', message: 'eval() in the change' },
  { pattern: /new\s+Function\s*\(/, type: 'function-constructor', message: 'new Function() in the change' },
  { pattern: /process\.env\.[A-Z_]+/, type: 'env-access', message: 'direct process.env access in demo code' },
  { pattern: /https?:\/\/(?!localhost|127\.0\.0\.1)/, type: 'external-url', message: 'hardcoded external URL in the change' },
];

/** Extract the numbered rules from AGENTS.md. */
export function loadAgentRules(root) {
  const text = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  const rules = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (m) rules.push(m[1]);
  }
  return rules;
}

/**
 * Review an implementation plan against AGENTS.md.
 * @returns {Array<{severity, type, message}>}
 */
export function reviewPlan(root, ticket, plan) {
  const findings = [];
  // Rule 1 — every change ships with a test.
  if (!ticket.tests || ticket.tests.length === 0) {
    findings.push({ severity: 'blocker', type: 'missing-test', message: 'AGENTS.md rule 1: ticket declares no test' });
  }
  // Rule 2 — no new runtime dependencies without a note.
  const changeSrc = ticket.change && existsSync(join(root, ticket.change))
    ? readFileSync(join(root, ticket.change), 'utf8') : '';
  if (/package\.json|npm\s+install|require\(['"]/.test(changeSrc)) {
    findings.push({ severity: 'blocker', type: 'new-dependency', message: 'AGENTS.md rule 2: change script touches dependencies — needs a note in the ticket' });
  }
  // Rule 3 — no secrets.
  for (const p of SECRET_PATTERNS) {
    if (p.test(changeSrc) || p.test(JSON.stringify(ticket))) {
      findings.push({ severity: 'blocker', type: 'secret', message: 'AGENTS.md rule 3: secret-like pattern in ticket/change script' });
    }
  }
  // Plan shape.
  if (!plan.steps || plan.steps.length === 0) {
    findings.push({ severity: 'blocker', type: 'empty-plan', message: 'implementation plan has no steps' });
  }
  if (findings.length === 0) {
    findings.push({ severity: 'info', type: 'plan-ok', message: `plan satisfies AGENTS.md rules (${plan.steps.length} steps)` });
  }
  return findings;
}

/**
 * Review a code diff (changed files, before/after contents).
 * @param {string} root
 * @param {Array<{file: string, before: string|null, after: string|null}>} changes
 * @param {object} ticket
 * @returns {Array<{severity, type, message, file?}>}
 */
export function reviewDiff(root, changes, ticket) {
  const findings = [];
  for (const { file, after } of changes) {
    if (after === null) continue; // deleted file — allowed only if the ticket says so
    for (const { pattern, type, message } of FORBIDDEN_IN_DIFF) {
      if (pattern.test(after)) {
        findings.push({ severity: 'blocker', type, message: `${message} (${file})`, file });
      }
    }
    // Syntax check for JS files.
    if (/\.(m?js)$/.test(file)) {
      try {
        execFileSync('node', ['--check', join(root, file)], { stdio: 'ignore', timeout: 15000 });
      } catch {
        findings.push({ severity: 'blocker', type: 'syntax-error', message: `node --check failed (${file})`, file });
      }
    }
  }
  // Test coverage: the ticket's declared tests must exist on disk after the
  // change — they are the tests for this change (AGENTS.md rule 1).
  const changedSrc = changes
    .filter((c) => c.after !== null && /\.m?js$/.test(c.file) && !c.file.includes('.test.'))
    .map((c) => c.file);
  if (changedSrc.length > 0) {
    const declaredTestsExist = (ticket.tests || []).some((t) => {
      const p = join(root, t);
      return changes.some((c) => c.file === t) || existsSync(p);
    });
    if (!declaredTestsExist) {
      findings.push({
        severity: 'blocker', type: 'missing-test',
        message: `AGENTS.md rule 1: changed source ${changedSrc[0]} has no test`,
        file: changedSrc[0],
      });
    }
  }
  if (findings.length === 0) {
    findings.push({ severity: 'info', type: 'diff-ok', message: `${changes.length} file(s) changed, no blocking findings` });
  }
  return findings;
}
