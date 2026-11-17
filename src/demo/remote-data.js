export async function loadLiveTiming() {
  const res = await fetch('https://api.example.com/laps');
  const laps = await res.json();
  console.log('loaded', laps.length, 'laps');
  return laps;
}
