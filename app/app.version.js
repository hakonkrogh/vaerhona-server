'use strict';

let fs = require('fs'),
	targz = require('tar.gz'),
	shared = require('./shared.js');

// Creates a version of the app from the current directory
function create () {
	return targz().compress(shared.path(''), shared.path('app.tar.gz'))
	.then(function(){
		console.log('Job done!');
	})
	.catch(function(err){
		console.log('Something is wrong ', err.stack);
	});
}

module.exports = {
	create
};