// require("dotenv").config();
import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

import { logger } from "./logger.js";
import { bleInit } from "./bluetooth.js";

async function boot() {
  // Get/set BOX_ID
  if (!process.env.BOX_ID) {
    const BOX_ID = uuidv4();
    await fs.writeFile("./.env", "BOX_ID=" + BOX_ID);

    process.env.BOX_ID = BOX_ID;
    startApp();
  } else {
    startApp();
  }
}

boot();

function startApp() {
  logger();
  bleInit();
  setInterval(logger, 1000 * 60 * 60);
}
