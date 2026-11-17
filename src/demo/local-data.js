export async function loadLocalTiming() {
  const res = await fetch('./data.json');
  return res.json();
}
