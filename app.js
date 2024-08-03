// require("dotenv").config();
import dotenv from "dotenv";
dotenv.config();

import { host, logger } from "./logger.js";
import { bleInit } from "./bluetooth.js";
import { regenerateBoxId } from "./boxid.js";
import { bashCmd, reboot, sleep } from "./utils.js";

async function boot() {
  // Get/set BOX_ID
  if (!process.env.BOX_ID) {
    const BOX_ID = await regenerateBoxId();
    process.env.BOX_ID = BOX_ID;

    startApp();
  } else {
    startApp();
  }

  async function startApp() {
    console.log("Starting app...");
    logger();
    bleInit();

    await sleep(10_000);

    // Take a snapshot every hour
    setInterval(logger, 1_000 * 60 * 60);

    // Reboot every day
    setTimeout(reboot, 1_000 * 60 * 60 * 24);

    // Ping something every minute to keep wifi alive
    setInterval(() => bashCmd(`ping ${host} -c 1`, true), 60_000);

    // Do a firmware update every 3 months-ish
    // setTimeout(firmwareUpdate, 1_000 * 60 * 60 * 24 * 30 * 3);
  }
}

boot();
