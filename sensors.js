const dht22 = require("node-dht-sensor").promises;

const values = {
  temperature: 0,
  humidity: 0,
};

function getValues() {
  return values;
}

async function readSensorValues() {
  try {
    const dht22values = await dht22.read(
      22, // Type
      4 // Pin
    );
    values.temperature = dht22values.temperature.toFixed(1);
    values.humidity = dht22values.humidity.toFixed(0);
  } catch (e) {}
}

readSensorValues();
setInterval(readSensorValues, 1000);

module.exports = {
  getValues,
};
