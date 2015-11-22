'use strict';

let shared = require('./shared.js'),
	configHandler = require('./config.js');

function update (networkInfo) {
	return new Promise((mainResolve, mainReject) => {
		
		let file1Promise = new Promise((resolve, reject) => {
			let pathWPASupp = "/etc/wpa_supplicant/wpa_supplicant.conf";
	    	fs.readFile(pathWPASupp, 'utf8', function (error, data) {
		        if (error !== null) {
		        	reject(error);
		        }
		        else {

		            if (networkInfo.removeOld) {
		                data = 'ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n';
		                data += 'update_config=1\n';
		            }

		            data += '\n';
		            data += '\nnetwork={';
		            data += '\nssid="' + networkInfo.ssid + '"';
		            data += '\npsk="' + networkInfo.psk + '"';
		            //data += '\nproto=' + networkInfo.protocol;
		            //data += '\nkey_mgmt=' + networkInfo.keyManagement;
		            //data += '\npairwise=' + networkInfo.pairwise;
		            //data += '\nauth_alg=' + networkInfo.authorization;
		            data += '\nid_str="' + networkInfo.Id + '"';
		            if (networkInfo.scan_ssid) {
		                data += '\nscan_ssid=1';
		            }
		            data += '\n}';

		            fs.writeFile(pathWPASupp, data, function (error) {
		            	if (error !== null) {
		            		reject(error);
		            	}
		            	else {
		            		resolve();
		            	}
		            });
		        }
		    });
		});

	    let file2Promise = new Promise((resolve, reject) => {
		    let pathInterfaces = "/etc/network/interfaces";
		    fs.readFile(pathInterfaces, 'utf8', function (error, data) {
		        if (error !== null) {
		        	reject(error);
		        }
		        else {

		            if (networkInfo.removeOld) {
		                data = 'auto lo';
		                data += '\n';
		                data += '\niface lo inet loopback';
		                data += '\niface eth0 inet dhcp';
		                data += '\n';
		                data += '\nallow-hotplug wlan0';
		                data += '\niface wlan0 inet manual';
		                data += '\nwpa-roam /etc/wpa_supplicant/wpa_supplicant.conf';
		                data += '\n';
		            }

		            data += '\n';
		            data += '\niface ' + networkInfo.Id + ' inet dhcp';
		            //data += '\naddress <' + networkInfo.Id + ' address>';
		            //data += '\ngateway <' + networkInfo.Id + ' gateway>';
		            //data += '\nnetmask <' + networkInfo.Id + ' netmask>';
		            data += '\n';

		            fs.writeFile(pathInterfaces, data, function (error) {
		            	if (error !== null) {
		            		reject(error);
		            	}
		            	else {
		            		resolve();
		            	}
		            });
		        }
		    });
		});

		return Promise.all([file1Promise, file2Promise]).then(() => {

			let config = configHandler.getConfig();
			
			// Store the network in config
		    if (!config.wifiNetworks || networkInfo.removeOld) {
		        config.wifiNetworks = [];
		    }

		    config.wifiNetworks.push(networkInfo);

		    return configHandler.setProp('wifiNetworks', config.wifiNetworks);
		}).then(() => {
			shared.reboot();
		});
	});
}

module.exports = {
	update
};