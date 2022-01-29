import bleno from "bleno";
import fs from "fs";
import { exec } from "child_process";
import fetch from "node-fetch";

import { getSensorValues } from "./sensors.js";
import { logger } from "./logger.js";
import { regenerateBoxId } from "./boxid";

const messageQueue = [];
const tx = new TextDecoder("utf-8");

function getSensorReadingMessage() {
  return {
    action: "sensor-reading",
    data: getSensorValues(),
  };
}

const getOnlineStatus = new Promise((resolve) => {
  async function runCheck() {
    try {
      const response = await fetch("https://google.com");

      resolve(response.ok);
    } catch (e) {
      resolve(false);
    }
  }

  setTimeout(runCheck, 2000);
});

let firmwareVersion = "n/a";
(async function getFirmwareVersion() {
  try {
    firmwareVersion = await bashCmd("git rev-parse --short HEAD");
  } catch (e) {
    console.log(e);
  }
})();

const wifiSettings = {
  path: "/etc/wpa_supplicant/wpa_supplicant.conf",
  get() {
    const content = fs.readFileSync(this.path, "utf-8");

    const [ssid, psk] = content
      .split("network={")[1]
      .split("}")[0]
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => a.split('"')[1]);
    console.log({ ssid, psk });
    return { ssid, psk };
  },
  async set(wifi) {
    const content = `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
    
network={
  ssid="${wifi.ssid}"
  psk="${wifi.psk}"
}`;

    fs.writeFileSync(this.path, content);

    messageQueue.push({
      action: "wifi-settings",
      data: wifiSettings.get(),
    });

    setTimeout(reboot, 1000);
  },
};

// Ensure file access for wifi settings
bashCmd(`sudo chmod 666 ${wifiSettings.path}`);

function reboot() {
  console.log("REBOOT!");
  bashCmd("sudo /bin/systemctl reboot");
}

function shutdown() {
  bashCmd("sudo /bin/systemctl poweroff");
}

function firmwareUpdate() {
  bashCmd(
    "git fetch origin && git reset --hard origin/main && npm install && sudo /bin/systemctl reboot"
  );
}

// Do a firmware update every 3 months-ish
// setTimeout(firmwareUpdate, 1000 * 60 * 60 * 24 * 30 * 3);

async function bashCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        resolve(stdout.replace(/\n/g, ""));
      }
    });
  });
}

const uuid = "601202ac-16d1-4f74-819d-85788a5ad77a";

export function bleInit() {
  console.log(`Starting up bluetooth with uuid ${uuid}`);

  // Once bleno starts, begin advertising our BLE address
  bleno.on("stateChange", function (state) {
    console.log("State change: " + state);
    if (state === "poweredOn") {
      bleno.startAdvertising("Vaerhona", [uuid]);
    } else {
      bleno.stopAdvertising();
    }
  });

  // Notify the console that we've accepted a connection
  bleno.on("accept", function (clientAddress) {
    console.log("Accepted connection from address: " + clientAddress);
  });

  // Notify the console that we have disconnected from a client
  bleno.on("disconnect", function (clientAddress) {
    console.log("Disconnected from address: " + clientAddress);
  });

  // When we begin advertising, create a new service and characteristic
  bleno.on("advertisingStart", function (error) {
    if (error) {
      console.log("Advertising start error:" + error);
    } else {
      console.log("Advertising start success");
      bleno.setServices([
        // Define a new service
        new bleno.PrimaryService({
          uuid: uuid,
          characteristics: [
            // Define a new characteristic within that service
            new bleno.Characteristic({
              value: null,
              uuid: "34cd",
              properties: ["notify", "read", "write"],

              // If the client subscribes, we send out a message every 1 second
              onSubscribe: function (maxValueSize, updateValueCallback) {
                console.log("Device subscribed");
                clearInterval(this.intervalId);
                clearInterval(this.sensorReadingIntervalId);

                this.intervalId = setInterval(function () {
                  const message = messageQueue.splice(0, 1);
                  if (message && message.length === 1) {
                    console.log("about to send message", message[0]);
                    updateValueCallback(
                      Buffer.from(JSON.stringify(message[0]))
                    );
                  }
                }, 1000);

                function sendSensorReading() {
                  messageQueue.push(getSensorReadingMessage());
                }

                // Broadcasting the sensor readings
                this.sensorReadingIntervalId = setInterval(
                  sendSensorReading,
                  5000
                );
                sendSensorReading();

                setTimeout(async () => {
                  messageQueue.push({
                    action: "box-id",
                    data: process.env.BOX_ID,
                  });
                  messageQueue.push({
                    action: "version",
                    data: firmwareVersion,
                  });
                  messageQueue.push({
                    action: "wifi-settings",
                    data: wifiSettings.get(),
                  });

                  const isOnline = await getOnlineStatus;
                  messageQueue.push({
                    action: "is-online",
                    data: isOnline,
                  });
                }, 250);
              },

              // If the client unsubscribes, we stop broadcasting the message
              onUnsubscribe: function () {
                console.log("Device unsubscribed");
                clearInterval(this.intervalId);
                clearInterval(this.sensorReadingIntervalId);
              },

              // Send a message back to the client with the characteristic's value
              onReadRequest: function (offset, callback) {
                console.log("Read request received");
                callback(this.RESULT_SUCCESS, this.value || Buffer.from(""));
              },

              // Accept a new value for the characterstic's value
              onWriteRequest: async function (
                data,
                offset,
                withoutResponse,
                callback
              ) {
                this.value = data;

                try {
                  console.log("incoming write request");

                  const dataAsString = tx.decode(this.value);
                  console.log(dataAsString);

                  const json = JSON.parse(dataAsString);
                  switch (json.action) {
                    case "set-wifi": {
                      wifiSettings.set(json.data);
                      break;
                    }
                    case "firmware-update": {
                      firmwareUpdate();
                      break;
                    }
                    case "reboot": {
                      reboot();
                      break;
                    }
                    case "shutdown": {
                      shutdown();
                      break;
                    }
                    case "take-snapshot": {
                      logger();
                      break;
                    }
                    case "regenerate-boxid": {
                      await regenerateBoxId();
                      reboot();
                      break;
                    }
                  }
                } catch (e) {
                  console.log(e);
                }

                callback(this.RESULT_SUCCESS);
              },
            }),
          ],
        }),
      ]);
    }
  });
}
