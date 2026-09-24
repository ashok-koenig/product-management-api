// Event:   PreToolUse
// Matcher: Edit|Write|MultiEdit
// Purpose: Deny edits to sensitive/generated files: .env variants,
//          package-lock.json, and anything inside .git/ or node_modules/.
// Output:  JSON with hookSpecificOutput.permissionDecision "deny" to block;
//          no output (exit 0) to allow.

import path from 'node:path';

const PROTECTED_BASENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.test',
  'package-lock.json',
]);

const PROTECTED_DIR_SEGMENTS = new Set(['.git', 'node_modules']);

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};

const isProtectedPath = (filePath) => {
  if (!filePath) return false;
  const segments = filePath.split(/[\\/]+/).filter(Boolean);
  if (segments.some((segment) => PROTECTED_DIR_SEGMENTS.has(segment))) return true;
  return PROTECTED_BASENAMES.has(path.basename(filePath));
};

const extractFilePaths = (toolInput = {}) => {
  const paths = [];
  if (toolInput.file_path) paths.push(toolInput.file_path);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (edit?.file_path) paths.push(edit.file_path);
    }
  }
  return paths;
};

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
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

  const filePaths = extractFilePaths(event?.tool_input);
  const protectedPath = filePaths.find(isProtectedPath);

  if (protectedPath) {
    deny(`Editing "${protectedPath}" is blocked: this file is protected (.env files, package-lock.json, .git/, and node_modules/ cannot be modified by tools).`);
  }

  process.exit(0);
};

main().catch(() => process.exit(0));
