const bleno = require("bleno");
const fs = require("fs");
const { exec } = require("child_process");
const fetch = require("node-fetch");

const sensors = require("./sensors");
const logger = require("./logger");

const messageQueue = [];
const tx = new TextDecoder("utf-8");

function getSensorReadingMessage() {
  return {
    action: "sensor-reading",
    data: sensors.getValues(),
  };
}

let isOnline = false;
async function getOnlineStatus() {
  try {
    const response = await fetch("https://google.com");

    isOnline = response.ok;
  } catch (e) {
    console.log(e);
    isOnline = false;
  }

  return isOnline;
}

setTimeout(getOnlineStatus, 2000);

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
  set(wifi) {
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

function reboot() {
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

function bashCmd(cmd) {
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
    } else {
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    }
  });
}

const uuid = "601202ac-16d1-4f74-819d-85788a5ad77a";

function init() {
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
                }, 100);

                function sendSensorReading() {
                  messageQueue.push(getSensorReadingMessage());
                }

                // Broadcasting the sensor readings
                this.sensorReadingIntervalId = setInterval(
                  sendSensorReading,
                  5000
                );
                sendSensorReading();
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
              onWriteRequest: function (
                data,
                offset,
                withoutResponse,
                callback
              ) {
                this.value = data;

                try {
                  console.log("write request");

                  const dataAsString = tx.decode(this.value);
                  console.log(dataAsString);

                  const json = JSON.parse(dataAsString);
                  switch (json.action) {
                    case "get-wifi": {
                      messageQueue.push({
                        action: "wifi-settings",
                        data: wifiSettings.get(),
                      });
                      break;
                    }
                    case "set-wifi": {
                      wifiSettings.set(json.data);
                      break;
                    }
                    case "get-online": {
                      messageQueue.push({
                        action: "is-online",
                        data: isOnline,
                      });
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

module.exports = init;