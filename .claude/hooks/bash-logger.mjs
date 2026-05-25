// .claude/hooks/bash-logger.mjs
// Event:   PostToolUse  (matcher: Bash)
// Purpose: Append every Bash command to a personal history log.
// Runs:    async: true — background only.

import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event   = JSON.parse(Buffer.concat(chunks).toString());
const command = event?.tool_input?.command ?? '';
const ts      = new Date().toISOString();

if (!command) process.exit(0);

const logDir  = join(homedir(), '.claude');
const logPath = join(logDir, 'bash-history.jsonl');

try {
  mkdirSync(logDir, { recursive: true });
  appendFileSync(logPath, JSON.stringify({ ts, command }) + '\n', 'utf8');
} catch { /* ignore — logging failure must never block the workflow */ }

process.exit(0);
