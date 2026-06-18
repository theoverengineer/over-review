const { execFileSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const actionDistDir = path.join(repoRoot, 'dist', 'action');
const nccCli = require.resolve('@vercel/ncc/dist/ncc/cli.js');

rmSync(actionDistDir, { recursive: true, force: true });

execFileSync(
  process.execPath,
  [nccCli, 'build', 'dist/main.js', '-o', 'dist/action', '--minify'],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  }
);
