import bleno from "bleno";
import fetch from "node-fetch";

import { getSensorValues } from "./sensors.js";
import { captureAndUpload } from "./logger.js";
import { regenerateBoxId } from "./boxid.js";
import {
  reboot,
  shutdown,
  firmwareUpdate,
  osUpdate,
  bashCmd,
} from "./utils.js";
import { wifiSettings } from "./wifi.js";

// NOTE: trust model — this BLE control surface is intentionally
// UNAUTHENTICATED. The box is provisioned in a physically trusted setup
// phase, and short-range BLE proximity is treated as the trust boundary.
// Anyone able to connect can set wifi, reboot, and trigger firmware/OS
// updates. This is a known, accepted tradeoff for this device (see also the
// world-writable wifi config in wifi.js). Do not expose this service beyond
// short-range provisioning use.

// Single-client provisioning queue: only one BLE client is expected to be
// connected at a time, so this is shared process-wide.
const messageQueue = [];
const tx = new TextDecoder("utf-8");

// Checked fresh on each subscribe so the reported status reflects current
// connectivity rather than a value frozen at boot.
async function checkOnlineStatus() {
  try {
    const response = await fetch("https://google.com");
    return response.ok;
  } catch (e) {
    return false;
  }
}

// Resolved lazily and cached, so a client subscribing during early boot
// still gets the real version once git has been queried.
let firmwareVersionPromise;
function getFirmwareVersion() {
  if (!firmwareVersionPromise) {
    firmwareVersionPromise = bashCmd("git rev-parse --short HEAD").catch((e) => {
      console.log(e);
      return "n/a";
    });
  }
  return firmwareVersionPromise;
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
      return;
    }

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
              this.maxValueSize = maxValueSize;
              clearInterval(this.intervalId);
              clearInterval(this.sensorReadingIntervalId);

              this.intervalId = setInterval(() => {
                const message = messageQueue.splice(0, 1);
                if (message && message.length === 1) {
                  const payload = Buffer.from(JSON.stringify(message[0]));

                  // BLE notifications can't exceed the negotiated MTU and we
                  // don't fragment/reassemble — warn instead of silently
                  // delivering a truncated payload.
                  if (payload.length > this.maxValueSize) {
                    console.warn(
                      `Dropping BLE message '${message[0].action}': ` +
                        `${payload.length}B exceeds MTU ${this.maxValueSize}B`
                    );
                    return;
                  }

                  console.log("about to send message", message[0]);
                  updateValueCallback(payload);
                }
              }, 1000);

              function sendSensorReading() {
                messageQueue.push({
                  action: "sensor-reading",
                  data: getSensorValues(),
                });
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
                  data: await getFirmwareVersion(),
                });
                messageQueue.push({
                  action: "wifi-settings",
                  data: wifiSettings.get(),
                });
                messageQueue.push({
                  action: "is-online",
                  data: await checkOnlineStatus(),
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
                    messageQueue.push({
                      action: "wifi-settings",
                      data: wifiSettings.get(),
                    });
                    break;
                  }
                  case "firmware-update": {
                    firmwareUpdate();
                    break;
                  }
                  case "os-update": {
                    osUpdate();
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
                    captureAndUpload();
                    break;
                  }
                  case "regenerate-boxid": {
                    await regenerateBoxId(json.data);
                    reboot();
                    break;
                  }
                  default: {
                    console.log("Unknown action:", json.action);
                    callback(this.RESULT_UNLIKELY_ERROR);
                    return;
                  }
                }

                callback(this.RESULT_SUCCESS);
              } catch (e) {
                console.log(e);
                callback(this.RESULT_UNLIKELY_ERROR);
              }
            },
          }),
        ],
      }),
    ]);
  });
}
