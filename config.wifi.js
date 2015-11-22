'use strict';

let shared = require('./shared.js'),
	configHandler = require('./config.js');

let filesToUpdate = [
	{
		templatePath: './templates/wifi/wpa_supplicant',
		destinationPath: '/etc/wpa_supplicant/wpa_supplicant.conf'
	}
	//{
	//	templatePath: './templates/wifi/interfaces',
	//	destinationPath: '/etc/network/interfaces'
	//}
];

function updateFiles () {
	return configHandler.ready.then(() => {
		return shared.updateFilesFromTemplate(filesToUpdate, configHandler.getConfig());
	}).catch(error => {
		console.error("An error occured while updating wifi files", error);
	});
}

function addNetwork (networkInfo) {
	return configHandler.ready.then(() => {
		let config = configHandler.getConfig();

		if (networkInfo.removeOld) {
			config.wifiNetworks.length = 0;
		}

		// Get existing network index
		let existingNetworkIndex = -1;
		config.wifiNetworks.forEach((item, index) => {
			if (item.Id === networkInfo.Id) {
				existingNetworkIndex = index;
			}
		});
		
		// Update existing network
		if (existingNetworkIndex !== -1) {
			config.wifiNetworks[existingNetworkIndex] = networkInfo;
		}
		// Net network
		else {
			config.wifiNetworks.push(networkInfo);
		}

		return configHandler.setProp("wifiNetworks", config.wifiNetworks);
	}).then(() => {
		return updateFiles();
	}).catch(error => {
		console.error("An error occured while adding wifi network", error);
	});
}

module.exports = {
	addNetwork
};