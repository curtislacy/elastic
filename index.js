function Elastic() {
	this.defaultLogger = null;
	this.ec2Client = require( './lib/Ec2Client' );
	this.processHandler = require( './lib/SpawnProcess' );

	this.Util = new ( require( './lib/InstanceUtil' ) )( this );
	this.Util.setProcessHandler( this.processHandler );
	this.Util.setEc2Client( this.ec2Client );

	this.setLogger( {
		log: function( obj ) {
			console.log( obj );
		}
	} );
	this.spawnProcess = require( './lib/SpawnProcess' );
}

Elastic.prototype.LoadBalancedCluster = function( config ) {
	var cluster = new( require( './lib/LoadBalancedCluster' ))( config );
	cluster.setEc2Client( this.ec2Client );
	cluster.setLogger( this.defaultLogger );

	return cluster;
}

// A Shutdown Notifier is responsible for informing a remote system that it is about to be
// shut down, and informing the local system when the remote has completed any shutdown tasks.
Elastic.prototype.ShutdownNotifier = function( config ) {
	var controller = new ( require( './lib/Shutdown' )).Notifier( config );
	controller.setLogger( this.defaultLogger );

	return controller;
}

// A Shutdown Listener is responsible for receiving notification from the ShutdownController that
// the system on which it is running is about to be shut down.
Elastic.prototype.ShutdownListener = function( config ) {
	var listener = new ( require( './lib/Shutdown' )).Listener( config );
	listener.setLogger( this.defaultLogger );

	return listener;
}

// A LogExporter is responsible for periodically bundling up log files and pushing them to S3.
Elastic.prototype.S3LogExporter = function( config ) {
	var exporter = new( require( './lib/S3LogExporter' ))( config );
	exporter.setLogger( this.defaultLogger );

	return exporter;
}

// To execute commands on a remote system, you can use a RemoteSystem
Elastic.prototype.RemoteSystem = function( config ) {
	var remoteSystem = new( require( './lib/RemoteSystem' ))( config );
	remoteSystem.setLogger( this.defaultLogger );
	remoteSystem.setProcessHandler( this.processHandler );

	return remoteSystem;
}

Elastic.prototype.setLogger = function( logger ) {
	this.defaultLogger = logger;
	this.ec2Client.setLogger( logger );
}

Elastic.prototype.setEc2Client = function( client ) {
	this.ec2Client = client;
	this.ec2Client.setLogger( this.defaultLogger );
	this.Util.setEc2Client( client );
}

Elastic.prototype.getEc2Client = function() {
	return this.ec2Client;
}

Elastic.prototype.setProcessHandler = function( handler ) {
	this.processHandler = handler;
	this.Util.setProcessHandler( this.processHandler );
}

Elastic.prototype.getProcessHandler = function() {
	return this.processHandler;
}

module.exports = exports = Elastic;
