// .claude/hooks/format-on-save.mjs
// Event:   PostToolUse  (matcher: Edit|Write)
// Purpose: Run Prettier on every file Claude writes or edits.
// Output:  JSON additionalContext — tells Claude whether formatting succeeded.

import { execSync } from 'child_process';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event = JSON.parse(Buffer.concat(chunks).toString());
const file  = event?.tool_input?.file_path ?? '';

if (!file) process.exit(0);

// Only format JS, TS, JSON, and Markdown files
if (!/\.(js|jsx|ts|tsx|json|md)$/.test(file)) process.exit(0);

try {
  execSync(`npx prettier --write "${file}" --log-level silent`, { stdio: 'pipe' });
  process.stdout.write(JSON.stringify({
    additionalContext: `Prettier formatted: ${file}`,
  }));
} catch {
  process.stdout.write(JSON.stringify({
    additionalContext: `Prettier could not format ${file} — check for syntax errors.`,
  }));
}
process.exit(0);
