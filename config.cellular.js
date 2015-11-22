'use strict';

let shared = require('./shared.js'),
	configHandler = require('./config.js');

let filesToUpdate = [
	{
		templatePath: './templates/cellular/fona',
		destinationPath: '/etc/ppp/peers/fona'
	}
];

function updateFiles () {
	return configHandler.ready.then(() => {
		return shared.updateFilesFromTemplate(filesToUpdate, configHandler.getConfig());
	});
}

function changeAPN (apn) {
	return configHandler.ready.then(() => {
		return configHandler.setProp("apn", apn);
	}).then(() => {
		return updateFiles();
	}).catch(error => {
		console.error("Error. Could not change apn", error);
	});
}

module.exports = {
	changeAPN
};