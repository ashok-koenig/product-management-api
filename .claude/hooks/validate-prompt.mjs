// Event:   UserPromptSubmit
// Purpose: Block destructive-sounding prompts and prompts that try to
//          disable/remove/bypass hooks via the prompt itself.
// Output:  exit 2 + stderr message blocks the prompt; exit 0 allows it.

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};

const DESTRUCTIVE_PHRASES = [
  'delete all',
  'drop table',
  'truncate',
  'wipe the',
  'reset the database',
  'remove all products',
];

const CONFIRMATION_PHRASES = ['i confirm', 'confirmed', 'yes, proceed'];

const HOOK_TAMPER_PATTERNS = [
  /disable.*hook/,
  /remove.*hook/,
  /delete.*hook/,
  /bypass.*hook/,
];

const main = async () => {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const prompt = (event?.prompt ?? '').toLowerCase();
  if (!prompt) process.exit(0);

  const hasDestructivePhrase = DESTRUCTIVE_PHRASES.some(phrase => prompt.includes(phrase));
  const hasConfirmation = CONFIRMATION_PHRASES.some(phrase => prompt.includes(phrase));

  if (hasDestructivePhrase && !hasConfirmation) {
    process.stderr.write('This prompt looks destructive. Add "I confirm" to proceed.\n');
    process.exit(2);
  }

  const hasHookTamperAttempt = HOOK_TAMPER_PATTERNS.some(pattern => pattern.test(prompt));
  if (hasHookTamperAttempt) {
    process.stderr.write('Hooks cannot be disabled via a prompt.\n');
    process.exit(2);
  }

  process.exit(0);
};

main().catch(() => process.exit(0));
