'use strict';

let request = require('./request.js'),
	camera = require('./camera.js'),
	sensors = require('./sensors.js'),
	configHandler = require('./config.js'),
	wifiConfig = require('./config.wifi.js'),
	cellularConfig = require('./config.cellular.js');

// Collect data and send snapshot
function takeAndSend () {
	console.log("Starting snapshot..");

	return take()
	.then(function snapshotTaken (data) {
    	return send(data);
    }).then(responseBody => {
    	console.log('Snapshot logged', new Date());
    	handleResponseBody(responseBody);
    }).catch(err => {
    	console.error('Snapshot not logged', err);
    });
}

// Take a snapshot
function take () {
	return new Promise((resolve, reject) => {
		let imageBase64String;

		camera.takePicture()
		.then(function gotPicture (image) {
			imageBase64String = image.base64;
			return sensors.getData();
	    }).then(function gotSensorData (sensorData) {

	    	// Add the image to the sensor data to complete the snapshot data profile
	        sensorData.image = imageBase64String;

	        resolve(sensorData);
	    }).catch(err => {
	    	console.error(err);
	    });
	});
}

function send (snapshotData) {

	let config = configHandler.getConfig();

	// Extend data with place id
    snapshotData.placeId =  config.placeId;
	
	// Add IDs for all added wifi networks
    snapshotData.wifiNetworks = config.wifiNetworks.map(item => {
    	return item.Id;
    });

    return request.send(snapshotData);
}

// Handle the response from the API
function handleResponseBody (body) {
	
	let config = configHandler.getConfig();

	if (body.newLogPath) {
	    return configHandler.setProp("logPath", body.newLogPath).then(() => {
	        console.log("New log path: ", config.logPath);
	        shared.reboot();
	    });
	}

	else if (body.newAPN) {
		return cellularConfig.changeAPN(body.newAPN).then(() => {
	    	console.log("New apn: ", config.apn);
	        shared.reboot();
	    });
	}

	// New wifi network
	else if (body.wifiUpdate) {
		return wifiConfig.addNetwork(body.wifiUpdate).then(() => {
			console.log("New wifi settings saved!");
	    	shared.reboot();
	    });
	}

	// New firmware
	//else if (body.coreUpdate) {
	//    coreUpdate(body.coreUpdate);
	//}

	// General maintenance
	else if (body.reboot) {
	    shared.reboot();
	}
}

module.exports = {
	take,
	send,
	takeAndSend
};