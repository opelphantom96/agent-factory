// Change script for ticket T-003: add the legend feature.
// Usage: node tickets/changes/t-003-legend.mjs <repo-root>
// Idempotent: exits 0 without changes if the feature already exists.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: t-003-legend.mjs <repo-root>'); process.exit(2); }

const featuresPath = join(root, 'src/demo/features.js');
const testPath = join(root, 'src/demo/legend.test.js');

const FEATURE_CODE = `
FEATURES.push({
  id: 'legend',
  title: 'Legend',
  render() {
    const html = '<section><h2>Legend</h2><div class="legend">'
      + '<span><i class="swatch" style="background:#dc2626"></i>Speed</span>'
      + '<span><i class="swatch" style="background:#16a34a"></i>Throttle</span>'
      + '<span><i class="swatch" style="background:#2563eb"></i>Gear</span>'
      + '<span><i class="swatch" style="background:#dc2626;opacity:0.25"></i>DRS zone</span>'
      + '</div></section>';
    return { htmlExtra: html };
  },
});
`;

const TEST_CODE = `import test from 'node:test';
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
`;

const src = readFileSync(featuresPath, 'utf8');
if (src.includes("id: 'legend'")) {
  console.log('legend feature already present, skipping');
} else {
  writeFileSync(featuresPath, src + FEATURE_CODE);
  console.log('added legend feature to src/demo/features.js');
}
if (!existsSync(testPath)) {
  writeFileSync(testPath, TEST_CODE);
  console.log('added src/demo/legend.test.js');
} else {
  console.log('src/demo/legend.test.js already exists, skipping');
}
