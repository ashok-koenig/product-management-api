// .claude/hooks/bash-guard.mjs
// Event:   PreToolUse  (matcher: Bash)
// Purpose: Block dangerous shell commands; escalate .env access.

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event   = JSON.parse(Buffer.concat(chunks).toString());
const command = event?.tool_input?.command ?? '';

// ── Blocked patterns: [regex, reason] ─────────────────────────────────────
const BLOCKED = [
  [/rm\s+-rf\s+\/$/,             'permanently deletes the root filesystem'],
  [/rm\s+-rf\s+~$/,              'permanently deletes the home directory'],
  [/git\s+push.*--force/,         'force push rewrites remote history'],
  [/git\s+push\s+origin\s+main$/, 'direct push to main is forbidden; use a branch'],
  [/npm\s+publish/,               'publishing to npm requires manual review'],
  [/DROP\s+TABLE/i,               'dropping a database table'],
];

for (const [pattern, reason] of BLOCKED) {
  if (pattern.test(command)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName:           'PreToolUse',
        permissionDecision:      'deny',
        permissionDecisionReason: `Blocked: ${reason}.`,
      }
    }));
    process.exit(0);
  }
}

// ── Escalate .env access to user approval ─────────────────────────────────
if (/\.env/.test(command)) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName:           'PreToolUse',
      permissionDecision:      'ask',
      permissionDecisionReason:
        'This command touches .env. Confirm no secrets will be logged or committed.',
    }
  }));
  process.exit(0);
}

process.exit(0);
