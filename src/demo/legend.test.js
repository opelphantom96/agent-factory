import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLap } from './telemetry.js';
import { FEATURES } from './features.js';

test('legend feature renders all four entries', () => {
  const lap = generateLap(42);
  const feature = FEATURES.find((f) => f.id === 'legend');
  assert.ok(feature, 'feature not registered');
  const out = feature.render({ samples: lap.samples, stats: lap.stats, lap });
  assert.match(out.htmlExtra, /Legend/);
  assert.match(out.htmlExtra, /Speed/);
  assert.match(out.htmlExtra, /Throttle/);
  assert.match(out.htmlExtra, /Gear/);
  assert.match(out.htmlExtra, /DRS zone/);
});
