// Evidence recorder — every pipeline stage writes its result here.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function recordRun(root, record) {
  const dir = join(root, 'evidence', 'runs');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `${record.ticket}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(record, null, 2));
  return file;
}
