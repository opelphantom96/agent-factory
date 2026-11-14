// Full gate runner: syntax-check every source file, run all tests,
// rebuild the demo dashboard. Exit 0 only if everything is green.
// Used by `npm run verify` and by the factory's verify stage.
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

let ok = true;
for (const f of [...jsFiles(join(ROOT, 'src')), ...jsFiles(join(ROOT, 'scripts'))]) {
  ok = run('node', ['--check', f], `syntax ${f.replace(ROOT + '/', '')}`) && ok;
}
ok = run('node', ['--test'], 'tests') && ok;
ok = run('node', ['src/demo/render.js'], 'demo rebuild') && ok;

process.exit(ok ? 0 : 1);
