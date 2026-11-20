import test from 'node:test';
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
