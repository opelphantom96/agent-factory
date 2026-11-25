// Plugin registry for the F1 telemetry dashboard.
//
// The base dashboard (speed / throttle / gear charts + stats) is built by
// render.js. Each factory ticket appends exactly ONE feature to this file
// and registers it below — the factory's implement stage runs the ticket's
// change script, which appends the feature code here.
//
// Feature contract:
//   { id: string, title: string,
//     render(ctx): { svgExtra?: string, htmlExtra?: string } }
// ctx = { samples, stats, lap }. svgExtra is injected into the speed chart,
// htmlExtra is appended after the charts.

import { generateLap, SAMPLE_STEP_M, LAP_LENGTH_M } from './telemetry.js';

export const FEATURES = [
  // Features are added by factory tickets (T-001, T-002, T-003, ...).
];

export function detectDrsZones(samples) {
  // A DRS zone is a contiguous run at >= 300 km/h for >= 250 m.
  // Each sample stands for one SAMPLE_STEP_M segment starting at its
  // distance, so a run's true length is (last - first + step): a run of
  // 25 samples covers 250 m. Measuring first-to-last sample only
  // understates every run by one step (a 250 m run read as 240 m and was
  // dropped; every run under 260 m of coverage was missed). endM is the
  // true end of the last sample's segment, clamped to the lap length.
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const fast = samples[i].speed >= 300;
    if (fast && start === null) start = samples[i].distance;
    if ((!fast || i === samples.length - 1) && start !== null) {
      const last = fast ? samples[i].distance : samples[i - 1].distance;
      const end = Math.min(last + SAMPLE_STEP_M, LAP_LENGTH_M);
      if (end - start >= 250) zones.push({ startM: start, endM: end });
      start = null;
    }
  }
  return zones;
}

FEATURES.push({
  id: 'drs-zones',
  title: 'DRS zones',
  render(ctx) {
    const zones = detectDrsZones(ctx.samples);
    const top = ctx.yForSpeed(350);
    const bottom = ctx.yForSpeed(0);
    let rects = '';
    for (const z of zones) {
      const x1 = ctx.xFor(z.startM);
      const x2 = ctx.xFor(z.endM);
      const cx = (x1 + x2) / 2;
      rects += '<rect x="' + x1.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (bottom - top).toFixed(1) + '" fill="#dc2626" opacity="0.08"/>';
      rects += '<text x="' + cx.toFixed(1) + '" y="' + (top + 14).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#dc2626">DRS</text>';
    }
    const list = zones.map(function (z) { return z.startM + '–' + z.endM + ' m'; }).join(', ');
    const html = '<section><h2>DRS zones</h2><p>' + zones.length + ' DRS zone(s) detected (speed ≥ 300 km/h for ≥ 250 m): ' + list + '</p></section>';
    return { svgExtra: rects, htmlExtra: html };
  },
});

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

FEATURES.push({
  id: 'top-speed',
  title: 'Top speed marker',
  render(ctx) {
    let top = ctx.samples[0];
    for (const s of ctx.samples) {
      if (s.speed > top.speed) top = s;
    }
    const x = ctx.xFor(top.distance);
    const y = ctx.yForSpeed(top.speed);
    const svg = '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" fill="#dc2626"/>'
      + '<text x="' + (x + 8).toFixed(1) + '" y="' + (y - 8).toFixed(1) + '" font-size="12" font-weight="bold" fill="#dc2626">TOP ' + top.speed + ' km/h</text>';
    return { svgExtra: svg };
  },
});

export function detectBrakingZones(samples) {
  // A braking zone is a contiguous run with brake on for >= 50 m.
  // Each sample stands for one SAMPLE_STEP_M segment starting at its
  // distance, so a run's true length is (last - first + step): a run of
  // five samples covers 50 m. Measuring first-to-last sample only
  // understates every run by one step (a 50 m run read as 40 m and was
  // dropped; every run under 60 m of coverage was missed). endM is the
  // true end of the last sample's segment, clamped to the lap length.
  const zones = [];
  let start = null;
  for (let i = 0; i < samples.length; i++) {
    const braking = samples[i].brake === 1;
    if (braking && start === null) start = samples[i].distance;
    if ((!braking || i === samples.length - 1) && start !== null) {
      const last = braking ? samples[i].distance : samples[i - 1].distance;
      const end = Math.min(last + SAMPLE_STEP_M, LAP_LENGTH_M);
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
