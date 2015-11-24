'use strict';

let fs = require('fs'),
	shared = require('./shared.js'),
	configPath = shared.path('app.config.json'),
	config = {};

let ready = new Promise((resolve, reject) => {
	readFromFile().then(function readFromFileDone (contents) {
		config = contents;
		resolve(config);
	}).catch(function readFromFileFailed (reason) {
		console.error("Reading from config file failed.", reason);
	});
});

function readFromFile () {
	return new Promise((resolve, reject) => {
		fs.readFile(configPath, 'utf8', function (err, fileContents) {
			if (err !== null) {
				reject(err);
			}
			else {
				resolve(JSON.parse(fileContents));
			}
		});
	});
}

function saveToFile () {
	return new Promise((resolve, reject) => {
		fs.writeFile(configPath, JSON.stringify(config, null, 4), function (err) {
			if (err !== null) {
				reject(err);
			}
			else {
				resolve("Config saved");
			}
		});
	});
}

function getConfig () {
	return config;
}

function setProp (prop, value) {
	config[prop] = value;

	return saveToFile();
}

module.exports = {
	ready,
	setProp,
	getConfig,
	save: saveToFile
};