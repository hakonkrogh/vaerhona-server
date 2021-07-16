var util = require("util");
var bleno = require("bleno");

const sensors = require("./sensors");

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

var BlenoCharacteristic = bleno.Characteristic;

function getCurrentValue() {
  return JSON.stringify(sensors.getValues());
}

var EchoCharacteristic = function () {
  EchoCharacteristic.super_.call(this, {
    uuid: "ec0e",
    properties: ["read", "write", "notify"],
    value: null,
  });

  this._value = Buffer.from(str2ab(getCurrentValue()));
  this._updateValueCallback = null;
};

util.inherits(EchoCharacteristic, BlenoCharacteristic);

EchoCharacteristic.prototype.onReadRequest = function (offset, callback) {
  console.log(
    "EchoCharacteristic - onReadRequest: value = " + ab2str(this._value)
  );

  // callback(this.RESULT_SUCCESS, this._value);
  callback(this.RESULT_SUCCESS, Buffer.from(str2ab(getCurrentValue())));
};

EchoCharacteristic.prototype.onWriteRequest = function (
  data,
  offset,
  withoutResponse,
  callback
) {
  this._value = data;

  console.log(
    "EchoCharacteristic - onWriteRequest: value = " + ab2str(this._value)
  );

  if (this._updateValueCallback) {
    console.log("EchoCharacteristic - onWriteRequest: notifying");

    this._updateValueCallback(this._value);
  }

  callback(this.RESULT_SUCCESS);
};

EchoCharacteristic.prototype.onSubscribe = function (
  maxValueSize,
  updateValueCallback
) {
  console.log("EchoCharacteristic - onSubscribe");

  this._updateValueCallback = updateValueCallback;

  this.intervalId = setInterval(() => {
    console.log("Sending: yo");
    updateValueCallback(str2ab("yo"));
  }, 1000);
};

EchoCharacteristic.prototype.onUnsubscribe = function () {
  console.log("EchoCharacteristic - onUnsubscribe");

  this._updateValueCallback = null;
};

module.exports = EchoCharacteristic;
