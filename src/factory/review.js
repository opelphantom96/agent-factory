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
  { pattern: /\beval\s*\(/, type: 'eval-call', message: 'dynamic code evaluation call in the change' },
  { pattern: /new\s+Function\s*\(/, type: 'function-constructor', message: 'dynamic Function constructor call in the change' },
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
 * Review configuration (Day 11 challenge: "make the reviewer yours").
 *
 * The customized setup lives in `review/review-config.json`: the product
 * decisions the reviewer must respect, what it should catch, and what it
 * must not flag. `loadReviewConfig` reads it; when the file is absent the
 * custom profile falls back to the decisions documented in that file, so a
 * run never silently reverts to the generic reviewer.
 */
export function loadReviewConfig(root) {
  const p = join(root, 'review', 'review-config.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const NETWORK_PATTERNS = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bnew\s+WebSocket\s*\(/];
const EXTERNAL_URL = /https?:\/\/(?!localhost|127\.0\.0\.1)/;

// A first-to-last sample span compared against a numeric threshold,
// e.g. `if (end - start >= 250)`. Each telemetry sample stands for one
// SAMPLE_STEP_M segment starting at its distance, so the true covered
// length is (last - first + step) — comparing the bare span understates
// every run by one step.
const SPAN_COMPARISON = /\b(end|last)\s*-\s*(start|first)\s*>=?\s*\d/;

/**
 * Split a JS source file into top-level `function NAME(...) {...}` bodies.
 * Brace-matched; assumes no braces inside string literals in the scanned
 * code (true for the demo detectors today). Returns [{name, body}].
 */
export function extractFunctions(source) {
  const out = [];
  const re = /(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
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
        message: `${name} compares a first-to-last sample span against a threshold without adding SAMPLE_STEP_M — the same one-step undercount Qodo flagged in detectBrakingZones (PR #5, T-009) and detectDrsZones (PR #6, T-010); a run covering exactly the threshold is dropped`,
      });
    }
  }
  return findings;
}

/**
 * Custom-profile findings: the Day 11 setup. Same changed files, reviewed
 * against the product decisions in review/review-config.json instead of
 * the generic rules.
 */
function reviewWithCustomProfile(changes) {
  const findings = [];
  for (const { file, after } of changes) {
    if (after === null) continue;
    if (file.startsWith('src/demo/')) {
      if (NETWORK_PATTERNS.some((p) => p.test(after))) {
        if (EXTERNAL_URL.test(after)) {
          findings.push({
            severity: 'blocker', type: 'network-access',
            message: `demo must work offline from file:// — load from local data instead of a network URL (${file})`,
            file,
          });
        } else {
          // Adjusted rule 1 (Day 11 real comparison, PR #1): a relative
          // fetch of local data is NOT a network violation — but fetch()
          // is blocked when the demo opens from file://, so say that and
          // suggest inlining the data.
          findings.push({
            severity: 'info', type: 'local-data-load',
            message: `local data load — offline-safe (not a network violation), but fetch() is blocked from file:// — suggest inlining the data (${file})`, file,
          });
        }
      }
      if (/console\.log\s*\(/.test(after)) {
        findings.push({
          severity: 'warning', type: 'console-log-demo',
          message: `console.log in demo code — keep the dashboard output clean (${file})`,
          file,
        });
      }
    }
    if (file.startsWith('src/factory/') && /console\.log\s*\(/.test(after)) {
      findings.push({
        severity: 'info', type: 'console-log-factory',
        message: `console.log in factory CLI layer is intentional operator logging — not flagged (${file})`,
        file,
      });
    }
  }
  return findings;
}

/**
 * Review a code diff (changed files, before/after contents).
 * @param {string} root
 * @param {Array<{file: string, before: string|null, after: string|null}>} changes
 * @param {object} ticket
 * @param {{ profile?: 'default'|'custom' }} opts — 'custom' applies the
 *   Day 11 review setup (review/review-config.json); 'default' is the
 *   generic reviewer. The custom profile replaces the generic
 *   `external-url` finding with the product-specific `network-access`
 *   finding; all other generic checks still apply.
 * @returns {Array<{severity, type, message, file?}>}
 */
export function reviewDiff(root, changes, ticket, opts = {}) {
  const profile = opts.profile === 'custom' ? 'custom' : 'default';
  const findings = [];
  const forbidden = profile === 'custom'
    ? FORBIDDEN_IN_DIFF.filter((f) => f.type !== 'external-url')
    : FORBIDDEN_IN_DIFF;
  for (const { file, after } of changes) {
    if (after === null) continue; // deleted file — allowed only if the ticket says so
    for (const { pattern, type, message } of forbidden) {
      if (pattern.test(after)) {
        findings.push({ severity: 'blocker', type, message: `${message} (${file})`, file });
      }
    }
    // Day 19 (T-012) — span-undercount rule, demo code only. Runs in both
    // profiles: the defect pattern is product-independent.
    if (file.startsWith('src/demo/') && /\.(m?js)$/.test(file)) {
      for (const f of checkSpanUndercount(after)) {
        findings.push({ ...f, file });
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
  if (profile === 'custom') {
    findings.push(...reviewWithCustomProfile(changes));
  }
  if (findings.length === 0) {
    findings.push({ severity: 'info', type: 'diff-ok', message: `${changes.length} file(s) changed, no blocking findings` });
  }
  return findings;
}
