import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLap } from './telemetry.js';
import { FEATURES, sectorTimes } from './features.js';

test('sector times add up to (almost) the lap time', () => {
  const lap = generateLap(42);
  const sectors = sectorTimes(lap.samples);
  assert.equal(sectors.length, 3);
  const sum = sectors[0] + sectors[1] + sectors[2];
  assert.ok(Math.abs(sum - lap.stats.lapTimeS) < 0.5, 'sectors ' + sum + ' vs lap ' + lap.stats.lapTimeS);
  for (const s of sectors) assert.ok(s > 0, 'sector time should be positive');
});

test('lap-compare feature renders a table with deltas', () => {
  const lap = generateLap(42);
  const ref = generateLap(7);
  assert.notDeepEqual(lap.samples, ref.samples, 'reference lap should differ');
  const feature = FEATURES.find((f) => f.id === 'lap-compare');
  assert.ok(feature, 'feature not registered');
  const out = feature.render({ samples: lap.samples, stats: lap.stats, lap });
  assert.match(out.htmlExtra, /Lap comparison/);
  assert.match(out.htmlExtra, /Sector 1/);
  assert.match(out.htmlExtra, /Full lap/);
});
