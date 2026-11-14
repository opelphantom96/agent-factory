import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLap, lapStats, LAP_LENGTH_M } from './telemetry.js';
import { buildDashboard } from './render.js';

test('lap has one sample every 10 m over 5,412 m', () => {
  const lap = generateLap(42);
  assert.equal(lap.samples.length, 542); // 0, 10, …, 5410 m
  assert.equal(lap.samples[0].distance, 0);
  assert.equal(lap.samples.at(-1).distance, 5410);
});

test('same seed produces the same lap (deterministic)', () => {
  const a = generateLap(42);
  const b = generateLap(42);
  assert.deepEqual(a.samples, b.samples);
  assert.deepEqual(a.stats, b.stats);
});

test('different seeds produce different laps', () => {
  assert.notDeepEqual(generateLap(42).samples, generateLap(7).samples);
});

test('speed stays in a plausible F1 range and gears match speed', () => {
  const { samples } = generateLap(42);
  for (const s of samples) {
    assert.ok(s.speed >= 60 && s.speed <= 335, `speed ${s.speed}`);
    assert.ok(s.gear >= 1 && s.gear <= 8, `gear ${s.gear}`);
    assert.ok(s.throttle >= 0 && s.throttle <= 100, `throttle ${s.throttle}`);
    assert.ok(s.brake === 0 || s.brake === 1);
  }
});

test('lap stats are sane', () => {
  const { stats } = generateLap(42);
  assert.ok(stats.lapTimeS > 60 && stats.lapTimeS < 150, `lapTime ${stats.lapTimeS}`);
  assert.ok(stats.topSpeed > 300, `topSpeed ${stats.topSpeed}`);
  assert.ok(stats.avgSpeed > 150 && stats.avgSpeed < stats.topSpeed);
  assert.ok(stats.fullThrottlePct > 20 && stats.fullThrottlePct < 90);
});

test('dashboard HTML contains all three charts and the stats', () => {
  const html = buildDashboard(generateLap(42));
  assert.match(html, /Speed \(km\/h\)/);
  assert.match(html, /Throttle \(%\)/);
  assert.match(html, /Gear/);
  assert.match(html, /Lap time/);
  assert.match(html, /<svg/);
});
