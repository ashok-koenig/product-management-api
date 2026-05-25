// .claude/hooks/test-reminder.mjs
// Event:   Stop  (no matcher — fires after every response turn)
// Purpose: Inject a test reminder if src/ files were recently modified.
// Output:  JSON additionalContext — appended to Claude's context on the next turn.

import { statSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
// Stop event has no fields we need; just consume stdin

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const stampPath  = join(projectDir, '.claude', 'last-stop');
const srcPath    = join(projectDir, 'src');

// Ensure the .claude directory exists
mkdirSync(join(projectDir, '.claude'), { recursive: true });

// Read the stamp file mtime (create it if it does not exist)
let stampMtime = 0;
if (existsSync(stampPath)) {
  stampMtime = statSync(stampPath).mtimeMs;
} else {
  writeFileSync(stampPath, '', 'utf8');
}

// Find all .js files in src/ that are newer than the stamp
function findNewer(dir, since) {
  const results = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findNewer(full, since));
      else if (entry.name.endsWith('.js') && statSync(full).mtimeMs > since) {
        results.push(entry.name);
      }
    }
  } catch { /* dir may not exist */ }
  return results;
}

const changed = findNewer(srcPath, stampMtime);

// Update the stamp file to now
writeFileSync(stampPath, '', 'utf8');

if (changed.length > 0) {
  const names = changed.join(', ');
  process.stdout.write(JSON.stringify({
    additionalContext:
      `Source files changed this turn: ${names}. Remember to run npm test before committing.`,
  }));
}

process.exit(0);
