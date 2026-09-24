// Event:   PostToolUse
// Matcher: Bash
// Purpose: Append one JSON line per executed Bash command to
//          .claude/bash-history.jsonl with timestamp and command.
// Output:  none; always exits 0 (best-effort, never blocks).

import path from 'node:path';
import { appendFile } from 'node:fs/promises';

const LOG_PATH = path.join('.claude', 'bash-history.jsonl');

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};

const main = async () => {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const command = event?.tool_input?.command;
  if (!command) process.exit(0);

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    command,
  });

  await appendFile(LOG_PATH, `${line}\n`);
  process.exit(0);
};

main().catch(() => process.exit(0));
