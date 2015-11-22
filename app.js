'use strict';

let configHandler = require('./config.js'),
	sensors = require('./sensors.js'),
    snapshot = require('./snapshot.js');

console.log('Starting up app...');

// Wait for components that needs to startup
Promise.all([configHandler.ready, sensors.ready])
	.then(startup)
	.catch(err => {
		console.error(err);
	});

function startup () {
	let config = configHandler.getConfig();
	
	// Send snapshot now
	snapshot.takeAndSend();

	// Schedule snapshot interval
	setInterval(snapshot.takeAndSend, config.logInterval * 1000);

	// Echo each 10m
	setInterval(echo, 60 * 10 * 1000);
}

function echo () {
	console.log("Echo from vhsys", new Date());
}