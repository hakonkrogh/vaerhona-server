'use strict';

let configHandler = require('./config.js'),
	request = require('request');

function send (data) {

	let config = configHandler.getConfig();

    // Make sure we conform to whatever the API expects
    data.motionEvent = false;
    data.outsideTemperature = data.temperature;
    data.outsidePressure = data.pressure;
    data.outsideHumidity = data.humidity;
    data.outsideAltitude = data.altitude;

    // Extend data with place id
    data.placeId =  config.placeId;
    
    // Add IDs for all added wifi networks
    data.wifiNetworks = config.wifiNetworks.map(item => {
        return item.Id;
    });

    // Pass on the app version for possible update
    data.appVersion = config.appVersion;

    // Setup request
    var options = {
        uri: config.logPath,
        method: 'POST',
        gzip: true,
        json: data
    };

    return new Promise((resolve, reject) => {
        console.log("Request started", new Date());
    	request(options, function (error, response, body) {
            console.log("Request finished", new Date());
	        if (!error && response && response.statusCode == 200 && body && body.success) {
                resolve(body);
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