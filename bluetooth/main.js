var bleno = require("bleno");

var BlenoPrimaryService = bleno.PrimaryService;

function init() {
  var EchoCharacteristic = require("./characteristic");

  console.log("bleno - echo");

  bleno.on("stateChange", function (state) {
    console.log("on -> stateChange: " + state);

    if (state === "poweredOn") {
      bleno.startAdvertising("echo", ["ec00"]);
    } else {
      bleno.stopAdvertising();
    }
  });

  bleno.on("advertisingStart", function (error) {
    console.log(
      "on -> advertisingStart: " + (error ? "error " + error : "success")
    );

    if (!error) {
      bleno.setServices([
        new BlenoPrimaryService({
          uuid: "12345678-1234-5678-1234-56789abcdef0",
          characteristics: [new EchoCharacteristic()],
        }),
      ]);
    }
  });
}

module.exports = init;
