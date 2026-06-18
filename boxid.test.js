import fs from "fs/promises";
import os from "os";
import path from "path";

import { regenerateBoxId } from "./boxid.js";

// regenerateBoxId reads/writes "./.env" relative to cwd, so each test runs in
// a throwaway temp directory.
let tmpDir;
let originalCwd;

beforeEach(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "boxid-"));
  process.chdir(tmpDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("creates .env with a manual id when none exists", async () => {
  const id = await regenerateBoxId("manual-123");

  expect(id).toBe("manual-123");
  expect(await fs.readFile(".env", "utf-8")).toBe("BOX_ID=manual-123\n");
});

test("generates a uuid when no id is provided", async () => {
  const id = await regenerateBoxId();

  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  expect(await fs.readFile(".env", "utf-8")).toBe(`BOX_ID=${id}\n`);
});

test("replaces an existing BOX_ID while preserving other variables", async () => {
  await fs.writeFile(".env", "FOO=1\nBOX_ID=old\nBAR=2\n");

  await regenerateBoxId("new");

  expect(await fs.readFile(".env", "utf-8")).toBe("FOO=1\nBOX_ID=new\nBAR=2\n");
});

test("appends BOX_ID when missing, normalizing a missing trailing newline", async () => {
  await fs.writeFile(".env", "FOO=1");

  await regenerateBoxId("z");

  expect(await fs.readFile(".env", "utf-8")).toBe("FOO=1\nBOX_ID=z\n");
});
