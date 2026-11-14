// Deterministic F1 lap telemetry — zero dependencies.
//
// Lap: 5,412 m fictional "Harbour Ring" circuit, one sample every 10 m.
// The speed profile is built from corner control points, smoothed, and
// perturbed with a seeded PRNG so every run produces the same lap.

export const LAP_LENGTH_M = 5412;
export const SAMPLE_STEP_M = 10;

// [distanceM, targetSpeedKmh] — corners are the low points, straights the high ones.
const SPEED_POINTS = [
  [0, 305], [300, 330], [650, 95], [900, 150], [1200, 285], [1600, 320],
  [1950, 110], [2250, 175], [2600, 300], [2950, 88], [3300, 205],
  [3700, 325], [4100, 130], [4450, 240], [4800, 318], [5150, 100], [5412, 300],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function interpSpeed(distanceM) {
  for (let i = 0; i < SPEED_POINTS.length - 1; i++) {
    const [d0, s0] = SPEED_POINTS[i];
    const [d1, s1] = SPEED_POINTS[i + 1];
    if (distanceM >= d0 && distanceM <= d1) {
      const t = (d1 - d0) === 0 ? 0 : (distanceM - d0) / (d1 - d0);
      return s0 + (s1 - s0) * t;
    }
  }
  return SPEED_POINTS[SPEED_POINTS.length - 1][1];
}

function gearForSpeed(kmh) {
  if (kmh < 100) return 1;
  if (kmh < 130) return 2;
  if (kmh < 165) return 3;
  if (kmh < 200) return 4;
  if (kmh < 235) return 5;
  if (kmh < 270) return 6;
  if (kmh < 305) return 7;
  return 8;
}

/**
 * Generate one lap of telemetry.
 * @param {number} seed - changes the noise; same seed => same lap.
 * @returns {{ lapLengthM: number, samples: Array<{distance,speed,throttle,brake,gear}>, stats: object }}
 */
export function generateLap(seed = 42) {
  const rand = mulberry32(seed);
  const n = Math.floor(LAP_LENGTH_M / SAMPLE_STEP_M) + 1;
  const raw = [];
  for (let i = 0; i < n; i++) {
    raw.push(interpSpeed(i * SAMPLE_STEP_M));
  }
  // Smooth twice (5-point moving average) so corners look driven, not drawn.
  const smooth = (arr) => arr.map((_, i) => {
    let sum = 0; let count = 0;
    for (let k = -2; k <= 2; k++) {
      const j = i + k;
      if (j >= 0 && j < arr.length) { sum += arr[j]; count++; }
    }
    return sum / count;
  });
  let speed = smooth(smooth(raw));
  speed = speed.map((v) => Math.max(60, Math.min(335, v + (rand() - 0.5) * 4)));

  const samples = speed.map((v, i) => {
    const prev = i === 0 ? v : speed[i - 1];
    const dv = v - prev;
    let throttle; let brake = 0;
    if (dv < -1.2) { throttle = 0; brake = 1; }          // braking zone
    else if (dv > 0.5) { throttle = 97 + rand() * 3; }   // accelerating
    else { throttle = 40 + rand() * 20; }                // cornering, partial
    return {
      distance: i * SAMPLE_STEP_M,
      speed: Math.round(v * 10) / 10,
      throttle: Math.round(throttle),
      brake,
      gear: gearForSpeed(v),
    };
  });

  return { lapLengthM: LAP_LENGTH_M, samples, stats: lapStats(samples) };
}

/** Summary statistics for a lap. */
export function lapStats(samples) {
  let timeS = 0;
  let topSpeed = 0;
  let fullThrottle = 0;
  let braking = 0;
  for (const s of samples) {
    const vMs = (s.speed * 1000) / 3600;
    timeS += SAMPLE_STEP_M / vMs;
    if (s.speed > topSpeed) topSpeed = s.speed;
    if (s.throttle >= 95) fullThrottle++;
    if (s.brake === 1) braking++;
  }
  const avgSpeed = (LAP_LENGTH_M / 1000) / (timeS / 3600);
  return {
    lapTimeS: Math.round(timeS * 1000) / 1000,
    topSpeed: Math.round(topSpeed * 10) / 10,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    fullThrottlePct: Math.round((fullThrottle / samples.length) * 1000) / 10,
    brakingPct: Math.round((braking / samples.length) * 1000) / 10,
  };
}
