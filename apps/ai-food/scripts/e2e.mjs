import { spawnSync } from 'node:child_process';

if (process.env.VERCEL === '1') {
  console.log('[e2e] skipped on Vercel — runs in .github/workflows/e2e.yml');
  process.exit(0);
}

function runPlaywright(args) {
  const result = spawnSync('playwright', args, {
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runPlaywright(['install', 'chromium']);
runPlaywright(['test']);
