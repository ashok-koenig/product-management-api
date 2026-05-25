// .claude/hooks/session-context.mjs
// Event:   SessionStart (matcher: startup|compact)
// Purpose: Inject live project state into Claude's context at session start.
// Output:  stdout text is added to Claude's context window.

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the event payload (not needed for output but useful for guards)
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event = JSON.parse(Buffer.concat(chunks).toString());

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return '(unavailable)'; }
}

const branch  = run('git branch --show-current');
const commits = run('git log --oneline -3');

// Run tests silently and take the last 3 lines of output
let testStatus;
try {
  execSync('npm test --silent', { stdio: 'pipe' });
  testStatus = 'All tests passed.';
} catch (err) {
  const out = (err.stdout ?? '').toString().trim();
  testStatus = out.split('\n').slice(-3).join('\n') || 'Tests failed.';
}

// Everything written to stdout becomes part of Claude's context
process.stdout.write([
  '=== Product Management API — Session Context ===',
  '',
  `Git branch:     ${branch}`,
  'Last 3 commits:',
  ...commits.split('\n').map(l => `  ${l}`),
  '',
  `Test status:    ${testStatus}`,
  '',
  'Reminder: all async handlers must use catchAsync — never bare try/catch in routes.',
  'Reminder: response envelope must always be { success, data } or { success, error }.',
  '',
].join('\n'));

process.exit(0);
