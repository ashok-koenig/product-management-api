// .claude/hooks/validate-prompt.mjs
// Event:   UserPromptSubmit (no matcher — fires on every prompt)
// Purpose: Block destructive prompts without confirmation;
//          block hook-disable attempts.
// Block:   exit 2 + stderr message  ->  Claude receives the message as feedback.

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const event  = JSON.parse(Buffer.concat(chunks).toString());
const prompt = (event.prompt ?? '').toLowerCase();

// ── Guard 1: Destructive operations need confirmation ─────────────────────
const DESTRUCTIVE = [
  'delete all',
  'drop table',
  'truncate',
  'wipe the',
  'reset the database',
  'remove all products',
];

const CONFIRMATIONS = ['i confirm', 'confirmed', 'yes, proceed'];

for (const phrase of DESTRUCTIVE) {
  if (prompt.includes(phrase)) {
    const confirmed = CONFIRMATIONS.some(c => prompt.includes(c));
    if (!confirmed) {
      process.stderr.write(`Destructive operation detected: '${phrase}'.\n`);
      process.stderr.write("Add 'I confirm' to your prompt to proceed.\n");
      process.stderr.write("Example: 'Delete all inactive products. I confirm.'\n");
      process.exit(2);
    }
    break;
  }
}

// ── Guard 2: Prevent disabling hooks via a prompt ─────────────────────────
const HOOK_DISABLE = [
  'disable.*hook', 'remove.*hook', 'delete.*hook', 'bypass.*hook',
];

for (const pattern of HOOK_DISABLE) {
  if (new RegExp(pattern).test(prompt)) {
    process.stderr.write('Hooks cannot be disabled via a prompt.\n');
    process.stderr.write('Edit .claude/settings.json directly if a change is required.\n');
    process.exit(2);
  }
}

process.exit(0);
