const fetch = require("node-fetch");
const { StillCamera } = require("pi-camera-connect");
const sharp = require("sharp");

const sensors = require("./sensors");

const apis = [
  "https://5e25bd4b843e.ngrok.io",
  "https://xn--vrhna-sra2k.no",
  "https://vhbackup.kroghweb.no",
];

module.exports = function () {
  async function log() {
    try {
      const stillCamera = new StillCamera({
        width: 1920,
        height: 1080,
      });
      const image = await stillCamera.takeImage();

      const imageCompressed = await sharp(image)
        .jpeg({
          quality: 50,
        })
        .toBuffer();
      const imageBase64 = imageCompressed.toString("base64");

      function send(domain) {
        return fetch(`${domain}/api/graphql`, {
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
                ...sensors.getValues(),
              },
            },
          }),
        });
      }

      let response = await send(apis[0]);
      if (!response.ok) {
        console.log(`"${apis[0]}" failed. Trying "${apis[1]}"...`);
        console.log(JSON.stringify(await response.text(), null, 1));
        response = await send(apis[1]);
      }

      if (!response.ok) {
        console.log(`Fetch FAILED`);
        console.log(await response.text());
      } else {
        console.log(`Fetch OK`);
        const json = await response.json();

        if (json.errors) {
          console.log(JSON.stringify(json.errors, null, 1));
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  log();
  // setInterval(log, 1000 * 60 * 60);
};
