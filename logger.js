import fetch from "node-fetch";
import { execa } from "execa";
import sharp from "sharp";
import fs from "fs/promises";

import { getSensorValues } from "./sensors.js";

const apis = ["https://xn--vrhna-sra2k.no", "https://vhbackup.kroghweb.no"];

export async function logger() {
  try {
    await execa("libcamera-jpeg", ["-o", "snapshot.jpg", "-n"]);
    const image = await fs.readFile("./snapshot.jpg");

    const imageCompressed = await sharp(image)
      .jpeg({
        quality: 50,
      })
      .toBuffer();
    const imageBase64 = imageCompressed.toString("base64");

    console.log("will send");
    console.log("--image with length", imageBase64.length);
    console.log("--sensors", JSON.stringify(getSensorValues()));
    console.log("--boxId", process.env.BOX_ID);

    async function send(domain) {
      try {
        const r = await fetch(`${domain}/api/graphql`, {
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
        return r;
      } catch (e) {
        return {};
      }
    }

    let response = await send(apis[0]);
    if (!response.ok) {
      console.log(`"${apis[0]}" failed. Trying "${apis[1]}"...`);
      // console.log(JSON.stringify(await response.text(), null, 1));
      response = await send(apis[1]);
    }

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
    console.log(e);
  }
}
