'use strict';

let exec = require('child_process').exec,
	handlebars = require('handlebars'),
	fs = require('fs');

function path (subPath) {
	return `/home/pi/vhsys/app/${subPath}`;
}

function runUnixCommand (cmd) {
	return new Promise((resolve, reject) => {
		exec(cmd, function (error, stdout, stderr) {
			if (error !== null) {
				reject(error);
			}
			else {
				resolve(stdout);
			}
		});
	});
}

function reboot () {
	console.log("Rebooting...");
	return runUnixCommand('sudo reboot').catch(err => {
		console.error(err);
	});
}

// Takes an array of files to update, and the template data to use
function updateFilesFromTemplate (filesToUpdate, templateData) {
	
	return getTemplates().then(() => {
		return write();
	}).catch(error => {
		console.error("error", error);
	});

	function write () {

		let allPromises = [];
		
		filesToUpdate.forEach(file => {
			allPromises.push(new Promise((resolve, reject) => {

				// Compile new file contents
				let newFileContents = file.template(templateData);

				fs.writeFile(file.destinationPath, newFileContents, function (error) {
					if (error) {
						throw error;
					}
					
					resolve(newFileContents);
				});
			}));
		});

		return Promise.all(allPromises);
	}

	function getTemplates () {

		let allPromises = [];
		filesToUpdate.forEach(file => {
			allPromises.push(new Promise((resolve, reject) => {
				fs.readFile(file.templatePath, 'utf8', function (error, fileContents) {
					if (error) {
						throw error;
					}

					// Generate the template
					file.template = handlebars.compile(fileContents);

					resolve();
				});
			}));
		});

		return Promise.all(allPromises);
	}
}

module.exports = {
	path,
	reboot,
	runUnixCommand,
	updateFilesFromTemplate
};