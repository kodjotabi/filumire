import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const out = 'docs/audits/audit2-stages0-2-2026-10-13';
const env = { ...process.env, NODE_ENV: 'production', FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-audit2-browser-only-signing-secret-32-characters', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1', FILUMIRE_TEST_URL: 'http://127.0.0.1:3187', FILUMIRE_PLAYWRIGHT_MODULE: 'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs', FILUMIRE_NAVIGATION_ARTIFACTS: out };
env.FILUMIRE_CHROMIUM_PATH = 'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe';
if (process.argv[3]) env.FILUMIRE_BROWSER_CASE = process.argv[3];
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/learner', '-p', '3187', '-H', '127.0.0.1'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; server.stdout.on('data', data => logs += data); server.stderr.on('data', data => logs += data);
try {
 let ready = false;
 for (let attempt = 0; attempt < 60; attempt++) { try { if ((await fetch(env.FILUMIRE_TEST_URL + '/login')).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
 if (!ready) throw new Error('Local server failed to start');
 for (const [label, file] of [['navigation', 'tests/ask-filu-navigation.browser.mjs'], ['interface', 'tests/audit2-interface.browser.mjs']].filter(([label]) => !process.argv[2] || process.argv[2] === label)) {
  const r = spawnSync(process.execPath, [file], { env, encoding: 'utf8', timeout: 300000, maxBuffer: 8*1024*1024 });
  writeFileSync(`${out}/browser-${label}.log`, `${r.stdout ?? ''}${r.stderr ?? ''}`);
  console.log(`${label}: ${r.status}\n${r.stdout ?? ''}${r.stderr ?? ''}`);
  if (r.status !== 0) { process.exitCode = 1; break; }
 }
} finally { server.kill(); writeFileSync(`${out}/browser-server.log`, logs); }
