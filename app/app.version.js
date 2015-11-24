'use strict';

let fs = require('fs'),
	targz = require('tar.gz'),
	request = require('request'),
	shared = require('./shared.js'),
	configHandler = require('./config.js');

// Creates a version of the app from the current directory
function create () {
	return configHandler.ready.then(() => {
		let config = configHandler.getConfig();

		return targz().compress(shared.path(''), shared.path(`app.${config.appVersion}.tar.gz`));	
	})
	.then(function(){
		console.log('New app version created!');
	})
	.catch(function(err){
		console.log('Something is wrong ', err.stack);
	});
}

function update (path) {
	return new Promise((resolve, reject) => {
		var read = request.get(path);
		var write = targz().createWriteStream(shared.path('../'));
		 
		read.pipe(write);
		
		resolve("App update done");
	});
}

module.exports = {
	create,
	update
};