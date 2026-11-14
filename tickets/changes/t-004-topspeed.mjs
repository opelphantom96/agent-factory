// Change script for ticket T-004: add the top-speed marker feature.
// Usage: node tickets/changes/t-004-topspeed.mjs <repo-root>
// Idempotent: exits 0 without changes if the feature already exists.
//
// NOTE: this script deliberately does NOT write the test file. The ticket
// declares tests: ["src/demo/topspeed.test.js"] so the factory's code-review
// stage must flag "missing-test" and the PR Resolver (auto-fix) stage must
// generate the smoke test and re-verify. That is the point of this ticket.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-004-topspeed.mjs <repo-root>'); process.exit(2); }

const featuresPath = join(root, 'src/demo/features.js');

const FEATURE_CODE = `
FEATURES.push({
  id: 'top-speed',
  title: 'Top speed marker',
  render(ctx) {
    let top = ctx.samples[0];
    for (const s of ctx.samples) {
      if (s.speed > top.speed) top = s;
    }
    const x = ctx.xFor(top.distance);
    const y = ctx.yForSpeed(top.speed);
    const svg = '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" fill="#dc2626"/>'
      + '<text x="' + (x + 8).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" font-size="12" font-weight="bold" fill="#dc2626">TOP ' + top.speed + ' km/h</text>';
    return { svgExtra: svg };
  },
});
`;

const src = readFileSync(featuresPath, 'utf8');
if (src.includes("id: 'top-speed'")) {
  console.log('top-speed feature already present, skipping');
} else {
  writeFileSync(featuresPath, src + FEATURE_CODE);
  console.log('added top-speed feature to src/demo/features.js');
}
console.log('test file intentionally NOT created — the PR Resolver must generate it');
