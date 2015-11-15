'use strict';

let shared = require('./shared.js'),
	fs = require('fs'),
	RaspiCam = require('raspicam');

function takePicture () {
	let filePath = shared.path('snapshot.jpg');

	let camera = new RaspiCam({
		mode: 'photo',
		output: filePath,
		width: 1280,
		height: 960,
		quality: 25,
		timeout: 5000,
		encoding: 'jpg'
	});

	return new Promise((resolve, reject) => {
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
	});;
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