// .claude/hooks/protect-files.mjs
// Event:   PreToolUse  (matcher: Edit|Write|MultiEdit)
// Purpose: Block writes to protected files.
// Block:   JSON permissionDecision: deny  ->  Claude sees permissionDecisionReason.

import { basename } from 'path';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event = JSON.parse(Buffer.concat(chunks).toString());
const file  = event?.tool_input?.file_path ?? '';

if (!file) process.exit(0);

// Exact filenames that are never auto-edited
const PROTECTED = new Set([
  '.env', '.env.local', '.env.production', '.env.test',
  'package-lock.json', 'render.yaml',
]);

// Path substrings that are always protected
const PROTECTED_PATTERNS = [
  '.git/',
  'node_modules/',
  '\\.git\\\\',      // Windows path variant
  'node_modules\\\\',
];

const name = basename(file);
if (PROTECTED.has(name) || PROTECTED_PATTERNS.some(p => file.includes(p))) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName:           'PreToolUse',
      permissionDecision:      'deny',
      permissionDecisionReason:
        `${file} is a protected file. Edit it manually if a change is required.`,
    }
  }));
  process.exit(0);   // exit 0 with JSON — do NOT exit 2 when returning JSON
}

process.exit(0);
