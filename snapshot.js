'use strict';

let request = require('./request.js'),
	camera = require('./camera.js'),
	sensors = require('./sensors.js'),
	configHandler = require('./config.js');

// Collect data and send snapshot
function takeAndSend () {
	return take()
	.then(function snapshotTaken (data) {
    	return send(data);
    }).then(msg => {
    	console.log('Snapshot logged');
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

module.exports = {
	take,
	send,
	takeAndSend
};