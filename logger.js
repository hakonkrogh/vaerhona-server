import fetch from "node-fetch";
import fs from "fs";

import { reboot, takePicture } from "./utils.js";
import { getSensorValues } from "./sensors.js";

export const host = "xn--vrhna-sra2k.no";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function logger() {
  const sleepWon = "maybe";
  const res = await Promise.race([
    logToApi(),
    (async function () {
      await sleep(60_000 * 3);
      return sleepWon;
    })(),
  ]);

  if (res === sleepWon) {
    console.log("SLEEP WON");
    reboot();
    return;
  }

  return res;
}

async function logToApi() {
  try {
    await takePicture();
  } catch (err) {
    console.log("Could not take picture, continuing with old...");
  }

  try {
    const imageBase64 = fs.readFileSync("./snapshot.jpg", {
      encoding: "base64",
    });

    console.log("will send at " + new Date().toISOString());
    console.log("--image with length", imageBase64.length);
    console.log("--sensors", JSON.stringify(getSensorValues()));
    console.log("--boxId", process.env.BOX_ID);

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

    const response = await send();

    if (!response.ok) {
      throw new Error(`Snapshot FAILED`);
    }

    const json = await response.json();

    if (json.errors) {
      console.log(JSON.stringify(json.errors, null, 1));
      throw new Error(`Snapshot FAILED`);
    }

    console.log(`Snapshot sent`);
  } catch (e) {
    console.log("logger error ⛔️");
    console.log(e);
    // void reboot();
  }
}
