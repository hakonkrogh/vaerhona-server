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
        json: data,
        timeout: 60 * 5 * 1000
    };

    return new Promise((resolve, reject) => {
    	request(options, function (error, httpResponse, body) {
	        if (!error && httpResponse && httpResponse.statusCode == 200 && body && body.success) {
                resolve(body);
	        }
	        else {
	        	reject(error || httpResponse.statusMessage);
	        }
	    });
    });
}

module.exports = {
	send
};
