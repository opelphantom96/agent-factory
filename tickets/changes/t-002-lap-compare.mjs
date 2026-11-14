// Change script for ticket T-002: add the lap comparison feature.
// Usage: node tickets/changes/t-002-lap-compare.mjs <repo-root>
// Idempotent: exits 0 without changes if the feature already exists.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-002-lap-compare.mjs <repo-root>'); process.exit(2); }

const featuresPath = join(root, 'src/demo/features.js');
const testPath = join(root, 'src/demo/lap-compare.test.js');

const FEATURE_CODE = `
export function sectorTimes(samples) {
  // Split the lap into 3 sectors (0-1804, 1804-3608, 3608-5412 m) and
  // integrate dt = ds / v over each sector.
  const times = [0, 0, 0];
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i].distance;
    const s = d >= 3608 ? 2 : (d >= 1804 ? 1 : 0);
    times[s] += 10 / ((samples[i].speed * 1000) / 3600);
  }
  return times;
}

FEATURES.push({
  id: 'lap-compare',
  title: 'Lap comparison',
  render(ctx) {
    const ref = generateLap(7);
    const cur = sectorTimes(ctx.samples);
    const refS = sectorTimes(ref.samples);
    let rows = '';
    for (let s = 0; s < 3; s++) {
      const delta = cur[s] - refS[s];
      const sign = delta >= 0 ? '+' : '−';
      rows += '<tr><td>Sector ' + (s + 1) + '</td><td>' + cur[s].toFixed(3) + ' s</td><td>' + refS[s].toFixed(3) + ' s</td><td>' + sign + Math.abs(delta).toFixed(3) + ' s</td></tr>';
    }
    const lapDelta = ctx.stats.lapTimeS - ref.stats.lapTimeS;
    const lapSign = lapDelta >= 0 ? '+' : '−';
    rows += '<tr><td><strong>Full lap</strong></td><td><strong>' + ctx.stats.lapTimeS.toFixed(3) + ' s</strong></td><td><strong>' + ref.stats.lapTimeS.toFixed(3) + ' s</strong></td><td><strong>' + lapSign + Math.abs(lapDelta).toFixed(3) + ' s</strong></td></tr>';
    const html = '<section><h2>Lap comparison</h2><p>Current lap (seed 42) vs reference lap (seed 7).</p><table><tr><th>Sector</th><th>Current</th><th>Reference</th><th>Delta</th></tr>' + rows + '</table></section>';
    return { htmlExtra: html };
  },
});
`;

const TEST_CODE = `import test from 'node:test';
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
`;

let src = readFileSync(featuresPath, 'utf8');
if (!src.includes("from './telemetry.js'")) {
  src = src.replace('export const FEATURES = [', "import { generateLap } from './telemetry.js';\n\nexport const FEATURES = [");
  writeFileSync(featuresPath, src);
  console.log('added telemetry import to src/demo/features.js');
}
src = readFileSync(featuresPath, 'utf8');
if (src.includes("id: 'lap-compare'")) {
  console.log('lap-compare feature already present, skipping');
} else {
  writeFileSync(featuresPath, src + FEATURE_CODE);
  console.log('added lap-compare feature to src/demo/features.js');
}
if (!existsSync(testPath)) {
  writeFileSync(testPath, TEST_CODE);
  console.log('added src/demo/lap-compare.test.js');
} else {
  console.log('src/demo/lap-compare.test.js already exists, skipping');
}
