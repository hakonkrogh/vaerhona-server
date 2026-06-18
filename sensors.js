import dht22Module from "node-dht-sensor";

const dht22 = dht22Module.promises;

const values = {
  temperature: 0,
  humidity: 0,
};

export function getSensorValues() {
  return values;
}

async function readSensorValues() {
  try {
    const dht22values = await dht22.read(
      22, // Type
      4 // Pin
    );
    values.temperature = parseFloat(dht22values.temperature.toFixed(1));
    values.humidity = parseInt(dht22values.humidity);
  } catch (e) {
    console.error("could not read sensor values");
    console.log(e);
  }
}

let started = false;

// Side effects (GPIO init + polling) are kept out of module load so the
// module can be imported off-device (e.g. in tests) without throwing.
export function initSensors() {
  if (started) return;
  started = true;

  dht22.setMaxRetries(10);
  dht22.initialize(22, 4);

  readSensorValues();
  setInterval(readSensorValues, 1000);
}
