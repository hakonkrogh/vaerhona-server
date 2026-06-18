import { bashCmd } from "./utils.js";

test("resolves with stdout", async () => {
  await expect(bashCmd("echo hi", true)).resolves.toBe("hi");
});

test("strips newlines from multiline output", async () => {
  await expect(bashCmd("printf 'a\\nb\\nc'", true)).resolves.toBe("abc");
});

test("rejects when the command exits non-zero", async () => {
  const err = jest.spyOn(console, "error").mockImplementation(() => {});

  await expect(bashCmd("exit 3", true)).rejects.toBeTruthy();

  err.mockRestore();
});
