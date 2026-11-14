// Qodo adapter — the integration point for real Qodo reviews.
//
// The factory is built around Qodo as the reviewer. When the Qodo CLI is
// installed and signed in (needs the user's Qodo account + free hackathon
// license), plan-review and code-review call it and merge its findings with
// the local rule-based review. Until then every record is honestly marked
// "qodo: unavailable — local fallback" — nothing is ever presented as a
// Qodo review that was not one.
import { execFileSync } from 'node:child_process';

/** Detect whether the Qodo CLI is usable in this environment. */
export function detectQodo() {
  try {
    const out = execFileSync('qodo', ['--version'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000,
    });
    return { available: true, version: String(out).trim() };
  } catch {
    return {
      available: false,
      reason: 'qodo CLI not installed or not signed in — needs a Qodo account (free hackathon license)',
    };
  }
}

/**
 * Run a Qodo review.
 * @param {{ scope: 'plan'|'diff', target: string }} opts
 * @returns {{ available: boolean, findings?: Array, reason?: string, raw?: string }}
 */
export function qodoReview({ scope, target }) {
  const detected = detectQodo();
  if (!detected.available) {
    return { available: false, reason: detected.reason };
  }
  // The Qodo CLI's review entry point. If the installed CLI uses a
  // different subcommand, this fails loudly and the local review stands.
  try {
    const out = execFileSync('qodo', ['review', target], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
    });
    return { available: true, scope, findings: parseQodoOutput(out), raw: out };
  } catch (e) {
    return {
      available: false,
      reason: `qodo review failed (${scope}): ${e.message}`,
      raw: e.stdout ? String(e.stdout) : '',
    };
  }
}

/** Best-effort parse of Qodo review output into findings. */
function parseQodoOutput(out) {
  const findings = [];
  for (const line of String(out).split('\n')) {
    const m = line.match(/^\s*[-*]\s*\[(blocker|warning|info)\]\s*(.+)$/i);
    if (m) findings.push({ severity: m[1].toLowerCase(), type: 'qodo', message: m[2] });
  }
  if (findings.length === 0 && out.trim()) {
    findings.push({ severity: 'info', type: 'qodo', message: out.trim().slice(0, 500) });
  }
  return findings;
}
