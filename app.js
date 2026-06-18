import dotenv from "dotenv";
dotenv.config();

import { host, captureAndUpload } from "./logger.js";
import { bleInit } from "./bluetooth.js";
import { regenerateBoxId } from "./boxid.js";
import { initSensors } from "./sensors.js";
import { bashCmd, reboot, sleep } from "./utils.js";

const HOUR = 1_000 * 60 * 60;
const DAY = HOUR * 24;

async function boot() {
  // Get/set BOX_ID
  if (!process.env.BOX_ID) {
    process.env.BOX_ID = await regenerateBoxId();
  }

  console.log("Starting app...");

  initSensors();
  captureAndUpload();
  bleInit();

  await sleep(10_000);

  // Take a snapshot every hour
  setInterval(captureAndUpload, HOUR);

  // Reboot every day
  setTimeout(reboot, DAY);

  // Ping the server every minute to keep wifi alive
  setInterval(() => bashCmd(`ping ${host} -c 1`, true), 60_000);

  // Do a firmware update every 3 months-ish
  // setTimeout(firmwareUpdate, 1_000 * 60 * 60 * 24 * 30 * 3);
}

boot();
