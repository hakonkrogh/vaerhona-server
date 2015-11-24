'use strict';

let fs = require('fs'),
	RaspiCam = require('raspicam'),
	shared = require('./shared.js'),
	configHandler = require('./config.js');

function takePicture () {
	return new Promise((resolve, reject) => {
		
		let filePath = shared.path('snapshot.jpg');

		configHandler.ready.then(() => {
			let config = configHandler.getConfig();

			let camera = new RaspiCam({
				mode: 'photo',
				output: filePath,
				width: config.image.width,
				height: config.image.height,
				quality: config.image.quality,
				timeout: config.image.timeout,
				encoding: config.image.format
			});

			if (camera.start()) {
				camera.on('exit', () => {
					imageToBase64(filePath).then(base64 => {
						resolve({
							filePath,
							base64
						});
					}).catch(err => {
						reject(err);
					});

					camera.stop();
				});
			}
			else {
				reject("Unable to start camera");
			}
		});
	});
}

// Take a image file argument and return a base64 string representation
function imageToBase64 (path) {
    return new Promise((resolve, reject) => {
    	fs.readFile(path, function (error, orig_data) {
	        if (error !== null) {
	            reject(error);
	        }
	        else {
		        var base64string = new Buffer(orig_data).toString('base64');
	            resolve(base64string);
	        }
	    });
	});
}

module.exports = {
	takePicture
};