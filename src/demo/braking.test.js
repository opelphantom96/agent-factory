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

test('a 50 m braking run is detected (one-step boundary)', () => {
  // Five consecutive samples at 10 m spacing cover exactly 50 m of track:
  // each sample stands for the 10 m segment starting at its distance.
  const samples = [];
  for (let d = 0; d <= 200; d += 10) {
    samples.push({ distance: d, speed: 200, throttle: 0, brake: d >= 100 && d <= 140 ? 1 : 0, gear: 4 });
  }
  const zones = detectBrakingZones(samples);
  assert.deepEqual(zones, [{ startM: 100, endM: 150 }], 'a 50 m run is a zone');
});

test('a 40 m braking run is not a zone (just under the threshold)', () => {
  // Four consecutive samples cover 40 m — under the 50 m threshold.
  const samples = [];
  for (let d = 0; d <= 200; d += 10) {
    samples.push({ distance: d, speed: 200, throttle: 0, brake: d >= 100 && d <= 130 ? 1 : 0, gear: 4 });
  }
  const zones = detectBrakingZones(samples);
  assert.equal(zones.length, 0, 'a 40 m run is not a zone');
});

test('seed 42 zones report their full covered length', () => {
  // The five long braking runs on lap seed 42, with endM at the true end
  // of the last sample's 10 m segment (not at the last sample itself).
  const { samples } = generateLap(42);
  assert.deepEqual(detectBrakingZones(samples), [
    { startM: 320, endM: 670 },
    { startM: 1610, endM: 1960 },
    { startM: 2620, endM: 2960 },
    { startM: 3710, endM: 4090 },
    { startM: 4800, endM: 5160 },
  ]);
});

test('braking-zones feature renders bands and a section', () => {
  const lap = generateLap(42);
  const feature = FEATURES.find((f) => f.id === 'braking-zones');
  assert.ok(feature, 'feature not registered');
  const out = feature.render({ samples: lap.samples, stats: lap.stats, lap, xFor: (d) => d, yForSpeed: (v) => v });
  assert.match(out.svgExtra, /BRAKE/);
  assert.match(out.htmlExtra, /Braking zones/);
});
