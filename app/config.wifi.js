'use strict';

let shared = require('./shared.js'),
	configHandler = require('./config.js');

let filesToUpdate = [
	{
		templatePath: './templates/wifi/wpa_supplicant',
		destinationPath: '/etc/wpa_supplicant/wpa_supplicant.conf'
	},
	{
		templatePath: './templates/wifi/interfaces',
		destinationPath: '/etc/network/interfaces'
	}
];

function updateFiles () {
	return configHandler.ready.then(() => {
		return shared.updateFilesFromTemplate(filesToUpdate, configHandler.getConfig());
	}).catch(error => {
		console.error("An error occured while updating wifi files", error);
	});
}

function addNetwork (networkInfo) {

	let vhsys_default = {
		Id: "vhsys_default",
		ssid: "vhsys_default",
		psk: "vhsys_default"
	};

	return configHandler.ready.then(() => {

		if (networkInfo.Id === vhsys_default.Id) {
			throw new Error(`Error: can not add network with id '${vhsys_default.Id}'`);
		}

		let config = configHandler.getConfig();

		if (networkInfo.removeOld) {
			config.wifiNetworks.length = 0;
			config.wifiNetworks.push(vhsys_default);
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
	addNetwork,
	updateFiles
};