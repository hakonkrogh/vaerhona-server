// require("dotenv").config();
import dotenv from "dotenv";
dotenv.config();

import { execa } from "execa";

import { logger } from "./logger";
import { bleInit } from "./bluetooth.js";

async function boot() {
  // Get BOX_ID
  if (!process.env.BOX_ID) {
    const { stdout } = await execa("cat", [
      " /proc/cpuinfo | grep Serial | cut -d ' ' -f 2'",
    ]);

    process.env.BOX_ID = stdout;
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
