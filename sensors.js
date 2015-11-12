'use strict';

// Handle temperature and humidity sensor
let sensorTempHum = (function () {

    let sensor = require('node-dht-sensor'),
        pinNumber = 18,
        data = {
            temperature: 0,
            humidity: 0
        },
        initFailed = false;

    // Startup
    if (initialize()) {
        read();
    } else {
        initFailed = true;
    }

    // Handle ready state
    let ready = new Promise(function (resolve, reject) {
        
        // Get the sensor data every 2 seconds
        let intervalId = setInterval(function checkInitData () {
            read();

            if (initFailed) {
                reject('Initialize failed for the temperature and humidity sensor');
                clearInterval(intervalId);
            }
            else if (data.humidity !== 0) {
                resolve(data);
                clearInterval(intervalId);
            }
        }, 2000);
    });

    function initialize () {
        return sensor.initialize(22, pinNumber);
    }

    function read () {
        let readout = sensor.read();

        data.temperature = parseFloat(readout.temperature.toFixed(2));
        data.humidity = parseFloat(readout.humidity.toFixed(2));

        return data;
    }

    function getTemperature () {
        return data.temperature;
    }

    function getHumidity () {
        return data.humidity;
    }

    return {
        ready,
        getTemperature,
        getHumidity
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
    let data = {};

    data.temperature = sensorTempHum.getTemperature();
    data.humidity = sensorTempHum.getHumidity();

    return new Promise((resolve, reject) => {
        sensorPressure.getPressure().then(function gotPressure (pressure) {
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