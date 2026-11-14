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
