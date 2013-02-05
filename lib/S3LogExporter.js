var s3 = require( 's3' );
var moment = require( 'moment' );
var spawnProcess = require( './SpawnProcess.js' );

function S3LogExporter( config ) {
	this.config = config;
	setTimeout( this.exportLogs.bind( this ), 500 );
}
S3LogExporter.prototype.compileLogs = function( callback ) {
	var tarArguments = [ '-czf', this.config.tmp + '/' + this.config.prefix + '.log.tgz' ];
	this.config.logFiles.forEach( function( file ) {
		tarArguments.push( file );
	});
	console.log( 'Tar arguments will be: ' + require( 'util' ).inspect( tarArguments ) );
	spawnProcess( 'tar', tarArguments, callback, callback );
}
S3LogExporter.prototype.getHostname = function( callback ) {
	spawnProcess ( 'hostname', [], callback, callback );
}	
S3LogExporter.prototype.cleanup = function( callback ) {
	var rmArguments = [ this.config.tmp + '/' + this.config.prefix + '.log.tgz' ];
	this.config.logFiles.forEach( function( file ) {
		rmArguments.push( file );
	});
	spawnProcess( 'rm', rmArguments, callback, callback );
}
S3LogExporter.prototype.exportLogs = function() {
	var self = this;

	if( !this.exportedOnce )
	{
		this.logger.log( 'System is starting up, exporting existing logs to S3.' );
		this.exportedOnce = true;
	}

	this.compileLogs( function() {
		var client = s3.createClient( {
			key: process.env.S3_API,
			secret: process.env.S3_SECRET,
			bucket: self.config.bucket
		});

		self.getHostname( function( name ) {
			var remoteFilename = self.config.prefix + '-' + name.trim() + '-' + moment().format() + '-logs.tgz';
			var uploader = client.upload( self.config.tmp + '/' + self.config.prefix + '.log.tgz', remoteFilename );
			uploader.on( 'end', function() {
				self.logger.log( 'Done Uploading logs to S3.' );
				self.cleanup( function() {
					self.logger.log( 'Done cleaning previous batch of logs: ' + remoteFilename );
					setTimeout( self.exportLogs.bind( self ), self.config.period );
				});
			});
		});
	} );
}
S3LogExporter.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
module.exports = exports = S3LogExporter;