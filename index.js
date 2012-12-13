var defaultLogger;

module.exports.ec2Client = require( './lib/Ec2Client' );
module.exports.LoadBalancedCluster = function( config ) {
	var cluster = new( require( './lib/LoadBalancedCluster' ))( config );
	cluster.setLogger( defaultLogger );

	return cluster;
}

module.exports.setLogger = function( logger ) {
	defaultLogger = logger;
	module.exports.ec2Client.setLogger( logger );
}

module.exports.setLogger( {
		log: function( obj ) {
			console.log( obj );
		}
	} );
