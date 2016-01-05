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

    // No motion detection (deprecated)
    data.motionEvent = false;
    data.motionVersion = -1;

    // Setup request
    var options = {
        uri: config.logPath,
        method: 'POST',
        gzip: true,
        json: data
    };

    // Split request into multiple request parts
    let parts = 4;
    let partsIndex = 0;
    let imageParts = chunkString(data.image, data.image.length / parts);

    return new Promise((resolve, reject) => {
        console.log("Request started", new Date());

        if (imageParts == null) {
            return reject("Error. Could not split string");
        }

        sendNextPart();
        function sendNextPart () {
            console.log('Send part', partsIndex + 1, '...');

            let imagePartsObj = {
                parts,
                partsIndex,
                part: imageParts[partsIndex]
            };

            data.image = imagePartsObj;

            request(options, function (error, httpResponse, body) {
                
                if (error) {
                    return reject(error);
                }

                if (httpResponse && httpResponse.statusCode == 200 && body && body.success) {
                    if (partsIndex === parts) {
                        console.log("Request finished", new Date());
                        resolve(body);
                    }
                    else {
                        partsIndex++;

                        data.snapshotid = body.snapshotid;

                        sendNextPart();
                    }
                }
                else {
                    console.log(httpResponse.statusMessage, body);
                    return reject(httpResponse ? httpResponse.statusMessage : "Unkown error");
                }
            });
        }
    });
}

function chunkString (str, chunkSize) {
  return str.match(new RegExp('.{1,' + chunkSize + '}', 'g'));
}

module.exports = {
	send
};
