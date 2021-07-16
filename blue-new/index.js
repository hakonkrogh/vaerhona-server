/**
 * Simple bleno echo server
 * Author: Shawn Hymel
 * Date: November 22, 2015
 *
 * Creates a Bluetooth Low Energy device using bleno and offers one service
 * with one characteristic. Users can use a BLE test app to read, write, and
 * subscribe to that characteristic. Writing changes the characteristic's
 * value, reading returns that value, and subscribing results in a string
 * message every 1 second.
 *
 * This example is Beerware (https://en.wikipedia.org/wiki/Beerware).
 */

// Using the bleno module
var bleno = require("bleno");

const sensors = require("../sensors");

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function str2ab(str) {
  var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function getSensorReadingMessage() {
  return {
    action: "sensor-reading",
    data: sensors.getValues(),
  };
}

function getWifiSettings() {
  return "n/a";
}

module.exports = function init() {
  const uuid = "601202ac-16d1-4f74-819d-85788a5ad77a";

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

  const messageQueue = [];
  const tx = new TextDecoder("utf-8");

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
                        data: getWifiSettings(),
                      });
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
};
