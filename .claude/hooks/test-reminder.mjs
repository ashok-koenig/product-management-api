// Event:   Stop
// Purpose: Remind Claude to run npm test if any .js file under src/
//          changed since the last turn (tracked via .claude/last-stop).
// Output:  JSON with decision "block" + reason to surface the reminder;
//          no output (exit 0) when nothing changed, on the first run, or
//          when re-invoked after already blocking (stop_hook_active) to
//          avoid a loop.

import path from 'node:path';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';

const STAMP_PATH = path.join('.claude', 'last-stop');
const SRC_DIR = 'src';

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};

const readStamp = async () => {
  try {
    const raw = await readFile(STAMP_PATH, 'utf8');
    const timestamp = Number(raw.trim());
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
};

const writeStamp = async (timestamp) => {
  await writeFile(STAMP_PATH, String(timestamp));
};

const findChangedJsFiles = async (since) => {
  let entries;
  try {
    entries = await readdir(SRC_DIR, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }

  const changed = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const filePath = path.join(entry.parentPath ?? entry.path ?? SRC_DIR, entry.name);
    try {
      const { mtimeMs } = await stat(filePath);
      if (mtimeMs > since) changed.push(path.relative('.', filePath));
    } catch {
      // File may have been removed between listing and stat; skip it.
    }
  }
  return changed;
};

const block = (reason) => {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
};

const main = async () => {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const now = Date.now();

  // Already re-invoked after a block on this same stop: don't block again.
  if (event?.stop_hook_active) {
    await writeStamp(now);
    process.exit(0);
  }

  const lastStop = await readStamp();

  if (lastStop === null) {
    await writeStamp(now);
    process.exit(0);
  }

  const changedFiles = await findChangedJsFiles(lastStop);
  await writeStamp(now);

  if (changedFiles.length === 0) process.exit(0);

  block(`Source files changed this turn: ${changedFiles.join(', ')}. Remember to run npm test before committing.`);
};

main().catch(() => process.exit(0));
