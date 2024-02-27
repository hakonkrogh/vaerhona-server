import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function regenerateBoxId(manualId) {
  const BOX_ID = manualId || uuidv4();
  await fs.writeFile("./.env", "BOX_ID=" + BOX_ID);

  return BOX_ID;
}
