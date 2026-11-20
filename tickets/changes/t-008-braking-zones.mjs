// Change script for ticket T-008 (Day 14: braking-zones feature).
// Usage: node tickets/changes/t-008-braking-zones.mjs <repo-root>
// Idempotent: exits 0 without changes if the feature and test already exist.
//
// Appends a braking-zones feature to src/demo/features.js (same pattern as
// the DRS-zones feature from T-001) and writes its test. A braking zone is
// a contiguous run with the brake on for >= 50 m. This change touches
// nothing under scripts/** — it is the outside-path test PR for Day 14.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-008-braking-zones.mjs <repo-root>'); process.exit(2); }

const FEATURE_CODE = `
export function detectBrakingZones(samples) {
  // A braking zone is a contiguous run with brake on for >= 50 m.
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const braking = samples[i].brake === 1;
    if (braking && start === null) start = samples[i].distance;
    if ((!braking || i === samples.length - 1) && start !== null) {
      const end = braking ? samples[i].distance : samples[i - 1].distance;
      if (end - start >= 50) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}

FEATURES.push({
  id: 'braking-zones',
  title: 'Braking zones',
  render(ctx) {
    const zones = detectBrakingZones(ctx.samples);
    const top = ctx.yForSpeed(350);
    const bottom = ctx.yForSpeed(0);
    let rects = '';
    for (const z of zones) {
      const x1 = ctx.xFor(z.startM);
      const x2 = ctx.xFor(z.endM);
      const cx = (x1 + x2) / 2;
      rects += '<rect x="' + x1.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (bottom - top).toFixed(1) + '" fill="#ea580c" opacity="0.08"/>';
      rects += '<text x="' + cx.toFixed(1) + '" y="' + (top + 14).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#ea580c">BRAKE</text>';
    }
    const list = zones.map(function (z) { return z.startM + '–' + z.endM + ' m'; }).join(', ');
    const html = '<section><h2>Braking zones</h2><p>' + zones.length + ' braking zone(s) detected (brake on for ≥ 50 m): ' + list + '</p></section>';
    return { svgExtra: rects, htmlExtra: html };
  },
});
`;

const TEST_SRC = `import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLap } from './telemetry.js';
import { FEATURES, detectBrakingZones } from './features.js';

test('braking zones are detected where the brake is on', () => {
  const { samples } = generateLap(42);
  const zones = detectBrakingZones(samples);
  assert.ok(zones.length >= 1, 'expected at least one braking zone');
  for (const z of zones) {
    assert.ok(z.endM - z.startM >= 50, 'zone too short');
    assert.ok(z.startM >= 0 && z.endM <= 5412, 'zone out of range');
  }
});

test('braking zones ignore short brake taps', () => {
  const samples = [];
  for (let d = 0; d <= 200; d += 10) {
    samples.push({ distance: d, speed: 200, throttle: 0, brake: d >= 100 && d < 130 ? 1 : 0, gear: 4 });
  }
  const zones = detectBrakingZones(samples);
  assert.equal(zones.length, 0, 'a 30 m brake tap is not a zone');
});

test('braking-zones feature renders bands and a section', () => {
  const lap = generateLap(42);
  const feature = FEATURES.find((f) => f.id === 'braking-zones');
  assert.ok(feature, 'feature not registered');
  const out = feature.render({ samples: lap.samples, stats: lap.stats, lap, xFor: (d) => d, yForSpeed: (v) => v });
  assert.match(out.svgExtra, /BRAKE/);
  assert.match(out.htmlExtra, /Braking zones/);
});
`;

const featuresPath = join(root, 'src/demo/features.js');
const src = readFileSync(featuresPath, 'utf8');
if (src.includes("id: 'braking-zones'")) {
  console.log('braking-zones feature already present, skipping');
} else {
  writeFileSync(featuresPath, src + FEATURE_CODE);
  console.log('added braking-zones feature to src/demo/features.js');
}

const testPath = join(root, 'src/demo/braking.test.js');
if (existsSync(testPath)) {
  console.log('src/demo/braking.test.js already exists, skipping');
} else {
  writeFileSync(testPath, TEST_SRC);
  console.log('wrote src/demo/braking.test.js');
}
