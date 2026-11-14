// Change script for ticket T-001: add the DRS zones feature.
// Usage: node tickets/changes/t-001-drs-zones.mjs <repo-root>
// Idempotent: exits 0 without changes if the feature already exists.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-001-drs-zones.mjs <repo-root>'); process.exit(2); }

const featuresPath = join(root, 'src/demo/features.js');
const testPath = join(root, 'src/demo/drs.test.js');

const FEATURE_CODE = `
export function detectDrsZones(samples) {
  // A DRS zone is a contiguous run at >= 300 km/h for >= 250 m.
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const fast = samples[i].speed >= 300;
    if (fast && start === null) start = samples[i].distance;
    if ((!fast || i === samples.length - 1) && start !== null) {
      const end = fast ? samples[i].distance : samples[i - 1].distance;
      if (end - start >= 250) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}

FEATURES.push({
  id: 'drs-zones',
  title: 'DRS zones',
  render(ctx) {
    const zones = detectDrsZones(ctx.samples);
    const top = ctx.yForSpeed(350);
    const bottom = ctx.yForSpeed(0);
    let rects = '';
    for (const z of zones) {
      const x1 = ctx.xFor(z.startM);
      const x2 = ctx.xFor(z.endM);
      const cx = (x1 + x2) / 2;
      rects += '<rect x="' + x1.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (bottom - top).toFixed(1) + '" fill="#dc2626" opacity="0.08"/>';
      rects += '<text x="' + cx.toFixed(1) + '" y="' + (top + 14).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#dc2626">DRS</text>';
    }
    const list = zones.map(function (z) { return z.startM + '–' + z.endM + ' m'; }).join(', ');
    const html = '<section><h2>DRS zones</h2><p>' + zones.length + ' DRS zone(s) detected (speed ≥ 300 km/h for ≥ 250 m): ' + list + '</p></section>';
    return { svgExtra: rects, htmlExtra: html };
  },
});
`;

const TEST_CODE = `import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLap } from './telemetry.js';
import { FEATURES, detectDrsZones } from './features.js';

test('DRS zones are detected on the fast straights', () => {
  const { samples } = generateLap(42);
  const zones = detectDrsZones(samples);
  assert.ok(zones.length >= 1, 'expected at least one DRS zone');
  for (const z of zones) {
    assert.ok(z.endM - z.startM >= 250, 'zone too short');
    assert.ok(z.startM >= 0 && z.endM <= 5412, 'zone out of range');
  }
});

test('drs-zones feature renders bands and a section', () => {
  const lap = generateLap(42);
  const feature = FEATURES.find((f) => f.id === 'drs-zones');
  assert.ok(feature, 'feature not registered');
  const out = feature.render({ samples: lap.samples, stats: lap.stats, lap, xFor: (d) => d, yForSpeed: (v) => v });
  assert.match(out.svgExtra, /DRS/);
  assert.match(out.htmlExtra, /DRS zones/);
});
`;

let src = readFileSync(featuresPath, 'utf8');
if (src.includes("id: 'drs-zones'")) {
  console.log('drs-zones feature already present, skipping');
} else {
  writeFileSync(featuresPath, src + FEATURE_CODE);
  console.log('added drs-zones feature to src/demo/features.js');
}
if (!existsSync(testPath)) {
  writeFileSync(testPath, TEST_CODE);
  console.log('added src/demo/drs.test.js');
} else {
  console.log('src/demo/drs.test.js already exists, skipping');
}
