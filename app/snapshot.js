'use strict';

let request = require('./request.js'),
	camera = require('./camera.js'),
	sensors = require('./sensors.js'),
	shared = require('./shared.js'),
	version = require('./app.version.js'),
	configHandler = require('./config.js'),
	wifiConfig = require('./config.wifi.js'),
	cellularConfig = require('./config.cellular.js');

// Collect data and send snapshot
function takeAndSend () {
	console.log("Starting snapshot..", new Date());

	return take()
	.then(function snapshotTaken (data) {
    	return request.send(data);
    }).then(responseBody => {
    	console.log('Snapshot finished', new Date());
    	handleResponseBody(responseBody);
    }).catch(err => {
    	console.error('An error occured during snapshot', err);
    });
}

// Take a snapshot
function take () {
	return new Promise((resolve, reject) => {
		let imageBase64String;

		camera.takePicture()
		.then(function gotPicture (image) {
			
			// Store the base64 string of the image temporarily
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

// Handle the response from the API
function handleResponseBody (body) {
	
	let config = configHandler.getConfig();

	// New API log path
	if (body.newLogPath) {
	    return configHandler.setProp("logPath", body.newLogPath).then(() => {
	        console.log("New log path: ", config.logPath);
	        shared.reboot();
	    });
	}

	// New cellular APN key
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

	// New app version
	else if (body.appUpdate) {
		console.log("App update available. Downloading and installing...");
		version.update(body.appUpdate.path).then(() => {
			return configHandler.setProp("appVersion", body.appUpdate.version);
		}).then(() => {
			console.log(`App updated to version ${body.appUpdate.version}!`);
			return shared.reboot();
		}).catch(err => {
	    	console.error("An error ocurred while updating app version!", err);
	    });
	}

	// General maintenance
	else if (body.reboot) {
	    shared.reboot();
	}
}

module.exports = {
	take,
	takeAndSend
};
