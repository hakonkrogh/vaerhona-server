import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function regenerateBoxId() {
  const BOX_ID = uuidv4();
  await fs.writeFile("./.env", "BOX_ID=" + BOX_ID);

  return BOX_ID;
}
