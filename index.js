module.exports.ec2Client = require( './lib/Ec2Client' );
module.exports.LoadBalancedCluster = require( './lib/LoadBalancedCluster' );

module.exports.setLogger = function( logger ) {
	module.exports.ec2Client.setLogger( logger );
	module.exports.LoadBalancedCluster.setLogger( logger );
}

module.exports.setLogger( {
		log: function( obj ) {
			console.log( 'l: ' + obj );
		}
	};
)