/**
 * Helper script to run dev with custom event settings
 * Usage: node scripts/run-dev.js <event-name> <payload-path>
 */

const { spawn } = require('child_process');
const path = require('node:path');

const workspaceRoot = path.dirname(__dirname);

const eventName = process.argv[2];
const payloadPath = process.argv[3];

if (!eventName || !payloadPath) {
  console.error('Usage: node scripts/run-dev.js <event-name> <payload-path>');
  console.error('Example: node scripts/run-dev.js pull_request payloads/pull-request-opened.json');
  process.exit(1);
}

const fullPath = path.isAbsolute(payloadPath) ? payloadPath : path.join(workspaceRoot, payloadPath);

const env = {
  ...process.env,
  GITHUB_EVENT_NAME: eventName,
  GITHUB_EVENT_PATH: fullPath,
};

console.log(`Running dev with event: ${eventName}`);
console.log(`Payload: ${fullPath}`);

const child = spawn(process.execPath, ['--env-file=.env', '--import', 'tsx', 'src/main.ts'], {
  env,
  stdio: 'inherit',
  cwd: workspaceRoot,
});

child.on('close', (code) => {
  process.exit(code || 0);
});
