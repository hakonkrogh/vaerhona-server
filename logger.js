import fetch from "node-fetch";
import fs from "fs";

import { reboot, takePicture, sleep } from "./utils.js";
import { getSensorValues } from "./sensors.js";

export const host = "xn--vrhna-sra2k.no";

const SLEEP_WON = Symbol("sleep-won");
const UPLOAD_WATCHDOG_MS = 60_000 * 3;
const MAX_ATTEMPTS = 3;

// Capture a snapshot and upload it to the API. Wrapped in a watchdog: if the
// whole operation hangs far past any reasonable duration the device is
// wedged, and a reboot is the only reliable recovery. That is the *only*
// place a reboot is justified — transient upload failures retry/back off
// inside captureAndUpload() instead of power-cycling the box.
export async function captureAndUpload() {
  const res = await Promise.race([
    upload(),
    sleep(UPLOAD_WATCHDOG_MS).then(() => SLEEP_WON),
  ]);

  if (res === SLEEP_WON) {
    console.log("Snapshot upload timed out — rebooting (watchdog)");
    reboot();
    return;
  }

  return res;
}

async function upload() {
  try {
    await takePicture();
  } catch (err) {
    console.log("Could not take picture, continuing with old...");
  }

  let imageBase64;
  try {
    imageBase64 = fs.readFileSync("./snapshot.jpg", { encoding: "base64" });
  } catch (err) {
    console.log("No snapshot available to send, skipping this cycle");
    return;
  }

  function send() {
    return fetch(`https://${host}/api/graphql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation($input: AddSnapshotMutationInput!) {
            snapshots {
              add(input: $input) {
                success
              }
            }
          }
        `,
        variables: {
          input: {
            boxId: process.env.BOX_ID,
            image: imageBase64,
            ...getSensorValues(),
          },
        },
      }),
    });
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await send();

      if (!response.ok) {
        throw new Error(`Snapshot FAILED (HTTP ${response.status})`);
      }

      const json = await response.json();

      if (json.errors) {
        console.log(JSON.stringify(json.errors, null, 1));
        throw new Error("Snapshot FAILED (GraphQL errors)");
      }

      console.log(`Snapshot sent (boxId ${process.env.BOX_ID})`);
      return;
    } catch (e) {
      console.log(`logger error ⛔️ (attempt ${attempt}/${MAX_ATTEMPTS})`);
      console.log(e);

      if (attempt < MAX_ATTEMPTS) {
        // Exponential backoff: 1s, then 2s.
        await sleep(1000 * 2 ** (attempt - 1));
      }
    }
  }

  console.log("Giving up on this snapshot; will retry next cycle");
}
