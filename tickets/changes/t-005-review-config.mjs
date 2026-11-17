// Change script for ticket T-005 (Day 11: make the reviewer yours).
// Usage: node tickets/changes/t-005-review-config.mjs <repo-root>
// Idempotent: exits 0 without changes if the config already exists
// with identical content.
//
// The customized review setup: the product decisions the reviewer must
// respect, what it should catch, and what it must not flag. Mirrors a
// Qodo repository-root .pr_agent.toml; the factory's local reviewer
// (src/factory/review.js, custom profile) enforces it until a real Qodo
// account is connected.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-005-review-config.mjs <repo-root>'); process.exit(2); }

const CONFIG = {
  version: 1,
  profile: 'day-11-custom',
  basedOn: 'Qodo repository-root review configuration (.pr_agent.toml), adapted for the factory local reviewer',
  challenge: 'Day 11: make the reviewer yours (email from Filip Hric at Qodo, 16 Nov 2026 19:04 WIB)',
  productDecisions: [
    {
      id: 'offline-first',
      decision: 'The F1 telemetry demo is a static dashboard opened from disk (file://) and must work fully offline.',
      reviewMust: 'Flag any network access in demo code as a blocker and suggest loading from local data instead.',
      reviewMustNot: 'Do not flag a relative fetch of local data as a problem.',
    },
    {
      id: 'zero-runtime-deps',
      decision: 'The factory and the demo have zero runtime dependencies.',
      reviewMust: 'Flag any new dependency or package install as a blocker unless the ticket notes it.',
      reviewMustNot: 'Do not suggest adding a library as a fix.',
    },
    {
      id: 'factory-logging',
      decision: 'console.log in the factory CLI layer is intentional operator logging.',
      reviewMust: 'Treat console.log under src/factory as allowed and say so explicitly.',
      reviewMustNot: 'Do not flag factory CLI logging as noise.',
    },
    {
      id: 'clean-dashboard-output',
      decision: 'The demo dashboard output must stay clean for the end user.',
      reviewMust: 'Warn on console.log in demo code.',
      reviewMustNot: null,
    },
  ],
  focus: [
    'network dependence in demo code',
    'missing tests',
    'secrets in code',
  ],
  ignore: [
    'console.log in src/factory (intentional CLI logging)',
  ],
  notes: 'Day 11 challenge: pick a real review that missed context, customize the setup, rerun on the same PR and compare. The original (default-profile) review and the customized review of the same sample change are recorded in evidence/runs/day-11-review-comparison.json. The real Qodo review comparison is pending a Qodo account; the local reviewer is the stand-in and is labelled as such. Decision: KEEP the custom setup — it is now the factory default review profile.',
};

const dir = join(root, 'review');
const target = join(dir, 'review-config.json');
const content = JSON.stringify(CONFIG, null, 2) + '\n';

if (existsSync(target) && readFileSync(target, 'utf8') === content) {
  console.log('review config already present with identical content, skipping');
} else {
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, content);
  console.log('wrote review/review-config.json (Day 11 custom review setup)');
}
