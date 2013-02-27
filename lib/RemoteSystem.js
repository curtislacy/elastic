function RemoteSystem( config ) {
	this.config = config;
	this.spawnProcess = require( './SpawnProcess' );
}
RemoteSystem.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
RemoteSystem.prototype.getProcessHandler = function() {
	return this.spawnProcess;
}
RemoteSystem.prototype.setProcessHandler = function( processHandler ) {
	this.spawnProcess = processHandler;
}
RemoteSystem.prototype.exec = function( command, callback ) {
	this.spawnProcess( 
		'ssh', [
			'-i', this.config.key,
			'-q',
			'-o', 'StrictHostKeyChecking=false',
			this.config.user + '@' + this.config.address,
			command
		],
		function( results ) {
			callback( null, results );
		},
		function( errors ) {
			callback( errors, null );
		}
	);
}
module.exports = exports = RemoteSystem;