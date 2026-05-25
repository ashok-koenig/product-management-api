// .claude/hooks/audit-log.mjs
// Event:   PostToolUse  (matcher: Edit|Write|MultiEdit)
// Purpose: Append a structured audit entry for every file change.
// Runs:    async: true — background, never blocks the response.

import { appendFileSync, mkdirSync } from 'fs';
import { execSync }                  from 'child_process';
import { join, dirname }             from 'path';
import { fileURLToPath }             from 'url';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event = JSON.parse(Buffer.concat(chunks).toString());

const file      = event?.tool_input?.file_path ?? '';
const tool      = event?.tool_name              ?? '';
const sessionId = event?.session_id             ?? '';
const projectDir= process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

if (!file) process.exit(0);

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
}

const branch    = run('git branch --show-current');
const timestamp = new Date().toISOString();
const logPath   = join(projectDir, '.claude', 'change-log.jsonl');

const entry = JSON.stringify({
  timestamp,
  file,
  tool,
  session_id: sessionId,
  branch,
});

try {
  mkdirSync(join(projectDir, '.claude'), { recursive: true });
  appendFileSync(logPath, entry + '\n', 'utf8');
} catch (err) {
  process.stderr.write(`audit-log: could not write log: ${err.message}\n`);
}

process.exit(0);
