// Event:   PostToolUse
// Matcher: Edit|Write|MultiEdit
// Purpose: Run `npx prettier --write` on any .js/.jsx/.ts/.tsx/.json/.md
//          file just edited, and report the result back via additionalContext.
// Output:  JSON with hookSpecificOutput.additionalContext describing what
//          was formatted (or why nothing was); always exits 0.

import path from 'node:path';
import { spawnSync } from 'node:child_process';

const FORMATTABLE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md']);

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

const respond = (additionalContext) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext,
      },
    }),
  );
  process.exit(0);
};

const main = async () => {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const filePaths = extractFilePaths(event?.tool_input).filter((filePath) =>
    FORMATTABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  );

  if (filePaths.length === 0) process.exit(0);

  const formatted = [];
  const failed = [];

  for (const filePath of filePaths) {
    const result = spawnSync('npx', ['prettier', '--write', filePath], {
      encoding: 'utf8',
      shell: true,
    });
    if (result.error || result.status !== 0) {
      failed.push({ filePath, message: (result.stderr || result.error?.message || 'unknown error').trim() });
    } else {
      formatted.push(filePath);
    }
  }

  const lines = [];
  if (formatted.length > 0) {
    lines.push(`Prettier formatted: ${formatted.join(', ')}.`);
  }
  if (failed.length > 0) {
    lines.push(...failed.map(({ filePath, message }) => `Prettier failed on ${filePath}: ${message}`));
  }

  respond(lines.join('\n'));
};

main().catch(() => process.exit(0));
