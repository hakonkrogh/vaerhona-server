import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

const ENV_PATH = "./.env";

// Persist BOX_ID without destroying any other variables already in .env.
export async function regenerateBoxId(manualId) {
  const BOX_ID = manualId || uuidv4();
  const line = `BOX_ID=${BOX_ID}`;

  let existing = "";
  try {
    existing = await fs.readFile(ENV_PATH, "utf-8");
  } catch (e) {
    // No .env yet — we'll create it below.
  }

  let next;
  if (/^BOX_ID=.*$/m.test(existing)) {
    next = existing.replace(/^BOX_ID=.*$/m, line);
  } else {
    const prefix = existing && !existing.endsWith("\n") ? existing + "\n" : existing;
    next = `${prefix}${line}\n`;
  }

  await fs.writeFile(ENV_PATH, next);

  return BOX_ID;
}
