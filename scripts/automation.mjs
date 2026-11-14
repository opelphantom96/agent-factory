// Ticket automation — the local stand-in for "Codex Automation + Linear".
//
// Watches tickets/ for new tickets with status "ready" and runs the factory
// on each, then updates the ticket status to "done" or "escalated".
// Real Linear/Codex wiring replaces the watcher once those accounts exist.
//
// Usage:
//   node scripts/automation.mjs            # one scan pass
//   node scripts/automation.mjs --watch    # watch continuously
import { readdirSync, readFileSync, writeFileSync, watch } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TICKETS_DIR = join(ROOT, 'tickets');

function scanOnce() {
  const files = readdirSync(TICKETS_DIR).filter((f) => f.endsWith('.json'));
  let ran = 0;
  for (const file of files) {
    const path = join(TICKETS_DIR, file);
    const ticket = JSON.parse(readFileSync(path, 'utf8'));
    if (ticket.status !== 'ready') continue;
    console.log(`[automation] ticket ${ticket.id} is ready → running factory`);
    let code = 1;
    try {
      execFileSync('node', ['src/factory/index.js', 'run', '--ticket', ticket.id], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
      code = 0;
    } catch (e) {
      code = e.status ?? 1;
    }
    ticket.status = code === 0 ? 'done' : 'escalated';
    writeFileSync(path, JSON.stringify(ticket, null, 2) + '\n');
    console.log(`[automation] ticket ${ticket.id} → ${ticket.status}`);
    ran++;
  }
  if (ran === 0) console.log('[automation] no ready tickets');
  return ran;
}

if (process.argv.includes('--watch')) {
  console.log('[automation] watching tickets/ (Ctrl+C to stop)');
  scanOnce();
  let timer = null;
  watch(TICKETS_DIR, () => {
    clearTimeout(timer);
    timer = setTimeout(scanOnce, 500);
  });
} else {
  scanOnce();
}
