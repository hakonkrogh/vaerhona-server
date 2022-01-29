// require("dotenv").config();
import dotenv from "dotenv";
dotenv.config();

import { logger } from "./logger.js";
import { bleInit } from "./bluetooth.js";
import { regenerateBoxId } from "./boxid.js";

async function boot() {
  // Get/set BOX_ID
  if (!process.env.BOX_ID) {
    const BOX_ID = await regenerateBoxId();
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
