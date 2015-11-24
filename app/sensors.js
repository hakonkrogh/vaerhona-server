'use strict';

// Handle temperature and humidity sensor
let sensorTempHum = (function () {

    let sensor = require('node-dht-sensor'),
        pinNumber = 23,
        data = {
            temperature: 0,
            humidity: 0
        },
        initFailed = false,
        intervalId;

    // Startup
    if (sensor.initialize(22, pinNumber)) {
        read();
    } else {
        initFailed = true;
    }

    // Handle ready state
    let ready = new Promise(function (resolve, reject) {

        if (initFailed) {
            reject('Initialize failed for the temperature and humidity sensor');
            clearInterval(intervalId);
        }
        
        // Pull for sensor data every 1 seconds
        intervalId = setInterval(function checkInitData () {
            read().then(() => {

                // Resolve the promise if we have a valid humidity (assuming we never reach 0%)
                if (data.humidity !== 0) {
                    resolve(data);
                    clearInterval(intervalId);
                }
            });
        }, 1000);
    });

    function read () {
        return new Promise((resolve, reject) => {
            let readout = sensor.read();

            data.temperature = parseFloat(readout.temperature.toFixed(2));
            data.humidity = parseFloat(readout.humidity.toFixed(2));

            resolve(data);
        });
    }

    function getData () {
        return read();
    }

    return {
        ready,
        getData
    };
}());

// Handle pressure sensor
let sensorPressure = (function () {
    let BMP085 = require('bmp085'),
        barometer = new BMP085({
            'mode': 1,
            'address': 0x77,
            'device': '/dev/i2c-1'
        }),
        pressure = -1;

    // Handle ready state
    let ready = new Promise(function (resolve, reject) {
        let intervalId = setInterval(function checkInitData () {
            getPressure().then(function gotPressure (pressure) {
                if (pressure !== -1) {
                    resolve(pressure);
                    clearInterval(intervalId);
                }
            });
        }, 2000);
    });

    function getPressure () {
        return new Promise((resolve, reject) => {
            barometer.read(function (data) {
                pressure = parseFloat(data.pressure.toFixed(2));
                resolve(pressure);
            });
        });
    }

    return {
        ready,
        getPressure
    };
}());

// Collects data from all the sensors
function getData () {
    let data;

    return new Promise((resolve, reject) => {
        sensorTempHum.getData().then(_data => {
            data = _data;
            return sensorPressure.getPressure();
        })
        .then(function gotPressure (pressure) {
            data.pressure = pressure;
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

// Wait for both sensors
let ready = Promise.all([sensorTempHum.ready, sensorPressure.ready]);

module.exports = {
    ready,
    getData
};