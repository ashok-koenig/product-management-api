// Event:   PostToolUse
// Matcher: Edit|Write|MultiEdit
// Purpose: Append one JSON line per changed file to .claude/change-log.jsonl
//          with timestamp, file, tool, session_id, and current git branch.
// Output:  none; always exits 0 (best-effort, never blocks).

import path from 'node:path';
import { appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const LOG_PATH = path.join('.claude', 'change-log.jsonl');

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};

const extractFilePaths = (toolInput = {}) => {
  const paths = new Set();
  if (toolInput.file_path) paths.add(toolInput.file_path);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (edit?.file_path) paths.add(edit.file_path);
    }
  }
  return [...paths];
};

const getGitBranch = async () => {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout.trim();
  } catch {
    return null;
  }
};

const main = async () => {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const filePaths = extractFilePaths(event?.tool_input);
  if (filePaths.length === 0) process.exit(0);

  const branch = await getGitBranch();
  const timestamp = new Date().toISOString();

  const lines = filePaths
    .map((file) =>
      JSON.stringify({
        timestamp,
        file,
        tool: event?.tool_name,
        session_id: event?.session_id,
        branch,
      }),
    )
    .join('\n');

  await appendFile(LOG_PATH, `${lines}\n`);
  process.exit(0);
};

main().catch(() => process.exit(0));
