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

// A first-to-last sample span compared against a threshold, e.g.
// `if (end - start >= 250)` or `if ((last - first) >= MIN_ZONE_M)`.
// Each telemetry sample stands for one SAMPLE_STEP_M segment starting
// at its distance, so the true covered length is (last - first + step) —
// comparing the bare span understates every run by one step. The
// comparison accepts parenthesized subtractions and named thresholds
// (PR #7 finding 2: `(end - start) >= 250` and `end - start >=
// MIN_ZONE_M` are the same defect as the bare form); it stays a
// heuristic warning, not a blocker.
const SPAN_COMPARISON = /\b(end|last)\s*-\s*(start|first)\s*\)*\s*>=?\s*(\d|[A-Za-z_$(])/;

/**
 * Remove // and block comments from JS source, preserving line breaks
 * and string-literal contents. Used by the span rule so a mention of
 * SAMPLE_STEP_M (or a span comparison) inside a comment cannot stand in
 * for real code (PR #7 finding 1: a reverted end calculation whose
 * explanatory comment remains must still be flagged). Assumes no regex
 * literals containing comment markers (true for the demo detectors
 * today); string literals are left intact.
 */
export function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null; // "'", '"', or '`' while inside a string literal
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        if (i + 1 < source.length) { out += source[i + 1]; i += 2; continue; }
      } else if (ch === quote) {
        quote = null;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; out += ch; i++; continue; }
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < source.length) { out += '  '; i += 2; }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Split a JS source file into `function NAME(...) {...}` bodies.
 * Single pass: declarations are collected, then one left-to-right brace
 * scan matches each declaration's opening brace to its closing brace
 * with a depth stack — nested declarations are frames on the same stack,
 * so every character is visited once (PR #7 finding 3: the previous
 * version rescanned from each declaration's opening brace, which is
 * quadratic on deeply nested code). The body brace is the first `{`
 * after the parameter list closes, so a default object parameter
 * (`function f(o = {}) {...}`) no longer truncates the body. Assumes no
 * braces inside string literals in the scanned code (true for the demo
 * detectors today). Returns [{name, body}] in declaration order.
 */
export function extractFunctions(source) {
  const declRe = /(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const decls = [];
  let m;
  while ((m = declRe.exec(source)) !== null) {
    // Find the matching close paren of the parameter list.
    let parenDepth = 0;
    let j = m.index + m[0].length - 1; // index of '('
    for (; j < source.length; j++) {
      if (source[j] === '(') parenDepth++;
      else if (source[j] === ')') {
        parenDepth--;
        if (parenDepth === 0) break;
      }
    }
    const open = source.indexOf('{', j);
    if (open === -1) continue;
    decls.push({ name: m[1], open, declIndex: m.index });
  }
  const byOpen = new Map(decls.map((d) => [d.open, d]));
  const stack = []; // {name, open, depth, declIndex}
  const out = [];
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      depth++;
      const d = byOpen.get(i);
      if (d) stack.push({ name: d.name, open: i, depth, declIndex: d.declIndex });
    } else if (ch === '}') {
      if (stack.length > 0 && stack[stack.length - 1].depth === depth) {
        const f = stack.pop();
        out.push({ name: f.name, body: source.slice(f.open, i + 1), declIndex: f.declIndex });
      }
      depth--;
    }
  }
  // Unclosed declarations (truncated input): keep the previous behaviour
  // of returning the body to the end of the input.
  for (const f of stack) out.push({ name: f.name, body: source.slice(f.open), declIndex: f.declIndex });
  out.sort((a, b) => a.declIndex - b.declIndex);
  return out.map(({ name, body }) => ({ name, body }));
}

/**
 * Day 19 (T-012) — span-undercount rule.
 *
 * Qodo caught the same defect twice: detectBrakingZones (PR #5, Medium,
 * T-009) and detectDrsZones (PR #6, Medium Reliability, T-010) both
 * measured a run first-to-last sample and compared the span against a
 * threshold, so a run covering exactly the threshold was dropped. A
 * detector body that compares a span against a number WITHOUT adding
 * SAMPLE_STEP_M in the code of the same body repeats that defect.
 * Mentions inside comments do not count (PR #7 finding 1): a reverted
 * end calculation whose explanatory comment remains must still be
 * flagged. The comparison also matches parenthesized subtractions and
 * named thresholds (PR #7 finding 2).
 *
 * Severity is 'warning', not 'blocker': the pattern is heuristic and a
 * human must confirm the finding (the T-009/T-010 fixes show what the
 * corrected form looks like). Returns [] when nothing matches.
 */
export function checkSpanUndercount(source) {
  const findings = [];
  for (const { name, body } of extractFunctions(source)) {
    const code = stripComments(body);
    if (SPAN_COMPARISON.test(code) && !code.includes('SAMPLE_STEP_M')) {
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
