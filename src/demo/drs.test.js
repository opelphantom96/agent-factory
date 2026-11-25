import test from 'node:test';
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

// Day 18 (T-010 draft): boundary test for the same one-step measurement
// pattern Qodo flagged in detectBrakingZones (T-009). Each sample covers
// one 10 m segment, so 25 fast samples cover 250 m and must be detected;
// 24 samples cover only 240 m and must not be. DRAFT — not pushed yet.
test('DRS zone of exactly 250 m coverage is detected (25 samples x 10 m)', () => {
  const samples = Array.from({ length: 25 }, (_, i) => ({ distance: 1000 + i * 10, speed: 310 }));
  const zones = detectDrsZones(samples);
  assert.equal(zones.length, 1, 'expected one DRS zone for 25 samples covering 250 m');
  assert.equal(zones[0].startM, 1000);
  assert.equal(zones[0].endM, 1250);
});

test('DRS run of 240 m coverage is not detected (24 samples x 10 m)', () => {
  const samples = Array.from({ length: 24 }, (_, i) => ({ distance: 1000 + i * 10, speed: 310 }));
  assert.equal(detectDrsZones(samples).length, 0, 'expected no DRS zone for 240 m');
});
