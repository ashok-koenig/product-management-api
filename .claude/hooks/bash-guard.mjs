// Event:   PreToolUse
// Matcher: Bash
// Purpose: Deny known-destructive commands (rm -rf /, rm -rf ~, force push,
//          npm publish, SQL DROP TABLE); ask for approval on any command
//          that mentions .env.
// Output:  JSON with hookSpecificOutput.permissionDecision "deny"/"ask" to
//          block/prompt; no output (exit 0) to allow.

const DENY_RULES = [
  { pattern: /\brm\s+-rf\s+\/(\s|$)/, reason: 'Refusing to run "rm -rf /": would recursively delete the filesystem root.' },
  { pattern: /\brm\s+-rf\s+~(\s|$)/, reason: 'Refusing to run "rm -rf ~": would recursively delete the home directory.' },
  { pattern: /\bgit\s+push\b[^&|;]*--force\b/, reason: 'Refusing "git push --force": can overwrite remote history/other people\'s work.' },
  { pattern: /\bnpm\s+publish\b/, reason: 'Refusing "npm publish": would publish a package to the registry.' },
  { pattern: /\bdrop\s+table\b/i, reason: 'Refusing SQL "DROP TABLE": would destroy a database table.' },
];

const ASK_PATTERN = /\.env\b/;

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};

const respond = (permissionDecision, permissionDecisionReason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason,
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

  const command = event?.tool_input?.command;
  if (!command || typeof command !== 'string') process.exit(0);

  const denyRule = DENY_RULES.find(({ pattern }) => pattern.test(command));
  if (denyRule) respond('deny', denyRule.reason);

  if (ASK_PATTERN.test(command)) {
    respond('ask', 'This command mentions .env and needs manual approval.');
  }

  process.exit(0);
};

main().catch(() => process.exit(0));
