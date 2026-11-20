// Full gate runner: syntax-check every source file, run all tests,
// rebuild the demo dashboard. Exit 0 only if everything is green.
// Used by `npm run verify` and by the factory's verify stage.
//
// Day 14 fix: the syntax check used to cover only src/ and scripts/,
// so a syntax error in a ticket change script (tickets/changes/*.mjs —
// executable code the factory runs) escaped the gate entirely and was
// only caught when the factory tried to run it. Change scripts are
// source files too; collectJsFiles() includes them now.
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function jsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules') continue;
      jsFiles(p, out);
    } else if (/\.m?js$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Every JS source file the gate syntax-checks: the factory + demo
 * (src/), the scripts (scripts/), and the ticket change scripts
 * (tickets/changes/ — executable code the factory runs on every ticket).
 * Exported so tests can assert the gate's coverage (AGENTS.md rule 1).
 */
export function collectJsFiles(root) {
  return [
    ...jsFiles(join(root, 'src')),
    ...jsFiles(join(root, 'scripts')),
    ...jsFiles(join(root, 'tickets', 'changes')),
  ];
}

function run(cmd, args, label) {
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', timeout: 120000 });
    console.log(`[verify] ${label}: OK`);
    return true;
  } catch {
    console.log(`[verify] ${label}: FAILED`);
    return false;
  }
}

// Only run the gate when this file is executed directly, so tests can
// import collectJsFiles() without exiting the process.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let ok = true;
  for (const f of collectJsFiles(ROOT)) {
    ok = run('node', ['--check', f], 'syntax ' + f.replace(ROOT + '/', '')) && ok;
  }
  ok = run('node', ['--test'], 'tests') && ok;
  ok = run('node', ['src/demo/render.js'], 'demo rebuild') && ok;

  process.exit(ok ? 0 : 1);
}
