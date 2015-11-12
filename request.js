'use strict';

let configHandler = require('./config.js'),
	request = require('request');

function send (data) {

	let config = configHandler.getConfig();

    data.motionEvent = false;
    data.outsideTemperature = data.temperature;
    data.outsidePressure = data.pressure;
    data.outsideHumidity = data.humidity;
    data.outsideAltitude = data.altitude;

    // Setup request
    var options = {
        uri: config.logPath,
        method: 'POST',
        gzip: true,
        json: data
    };

    return new Promise((resolve, reject) => {
    	request(options, function (error, response, body) {
	        if (!error && response && response.statusCode == 200) {
	        	resolve("success");
	        }
	        else {
	        	reject(error || "Error");
	        }
	    });
    });
}

module.exports = {
	send
};