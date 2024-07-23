import fetch from "node-fetch";
import fs from "fs/promises";

import { bashCmd } from "./utils.js";
import { getSensorValues } from "./sensors.js";

const host =
  "vaerhona-git-update-deps-hkon-kroghs-projects-9845328c.vercel.app";

export async function logger() {
  try {
    await bashCmd("libcamera-jpeg -o snapshot.jpg -q 50 -n");
    const image = await fs.readFile("./snapshot.jpg");
    const imageBase64 = image.toString("base64");

    console.log("will send at " + new Date().toISOString());
    console.log("--image with length", imageBase64.length);
    console.log("--sensors", JSON.stringify(getSensorValues()));
    console.log("--boxId", process.env.BOX_ID);

    function send(domain) {
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
      console.log(`Snapshot FAILED`);
      // console.log(await response.text());
    } else {
      const json = await response.json();

      if (json.errors) {
        console.log(`Snapshot FAILED`);
        console.log(JSON.stringify(json.errors, null, 1));
      } else {
        console.log(`Snapshot sent`);
      }
    }
  } catch (e) {
    console.log("logger error ⛔️");
    console.log(e);
  }
}
