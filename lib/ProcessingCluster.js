var ec2 = require( './Ec2Client' );
var Util = require( './InstanceUtil' );

function ProcessingCluster( config ) {
	this.config;
}
ProcessingCluster.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
ProcessingCluster.prototype.start = function() {
	var self = this;
	function TimerTask() {
		if( !self.stopped )
			self._shutdownIdleSystems( function() {
				setTimeout( TimerTask, 600000 );
			});
		});
	setTimeout( TimerTask, 60000 );
}
ProcessingCluster.prototype.stop = function() {
	this.stopped = true;
	this._terminateAllSystems();
}

/**
 * Execute the given function, which takes two arguments: a RemoteSystem, and a callback( error ).
 * Second argument is an error callback.
 **/
ProcessingCluster.prototype.process = function( func, errorFunc ) {
	var self = this;
	this._getLowUtilizationSystem( function( error, targetSystem ) {
		if( error )
			errorFunc( error );
		else
			func( targetSystem( function( error ) {
				if( error )
					log.error( 'elastic (' + self.config.name + '): Error delegating process to remote system', error );
				self._releaseSystem( targetSystem );
			}));
	});
}

/**
 * Callback: function( Error, RemoteSystem ).
 * Get the lowest utilization system which has a util less than 75%.
 * If no such system exists, creates a new one and hands it back.
 * Before the system is returned, marks it as in-use so that it is not terminated.
 **/
ProcessingCluster.prototype._getLowUtilizationSystem = function( callback ) {

}

/**
 * Takes the given RemoteSystem and reduces its in-use count.
 **/
ProcessingCluster.prototype._releaseSystem = function( remoteSystem ) {

}

ProcessingCluster.prototype._shutdownIdleSystems = function( callback ) {

}

ProcessingCluster.prototype._terminateAllSystems = function() {
	
}

module.exports = exports = ProcessingCluster;