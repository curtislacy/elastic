process.env.EC2_HOME = __dirname + '/ec2-api-tools-1.6.5.2';
process.env.PATH += ':' + process.env.EC2_HOME;

console.log( 'EC2_HOME: ' + process.env.EC2_HOME );

var tool_bin = process.env.EC2_HOME + '/bin/';

function Ec2() {
}
Ec2.prototype.getRunningInstances = function( region, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		tool_bin + 'ec2-describe-instances',
		[ '--region', region ],
		function( output ) {
			var instances = [];
			var dataLines = output.match( /INSTANCE\t[A-Za-z0-9\-]+\t[A-Za-z0-9\-]+\t[A-Za-z0-9\-\.]+\t[A-Za-z0-9\-\.]+/g );
			dataLines.forEach( function( line ) {
				var matches = line.match( /INSTANCE\t([A-Za-z0-9\-]+)\t([A-Za-z0-9\-]+)\t([A-Za-z0-9\-\.]+)\t([A-Za-z0-9\-\.]+)/ );
				var info = {
					"instance": matches[1],
					"ami": matches[2],
					"external": matches[3],
					"internal": matches[4]
				};
				instances.push( info );
			});
			callback( null, instances );
		},
		function( errors ) {
			callback( errors, null );
		}
	);
}
Ec2.prototype.getAMIs = function( region, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		tool_bin + 'ec2-describe-images',
		[ '--region', region ],
		function( output ) {
			var images = [];
			var dataLines = output.match( /IMAGE\t[A-Za-z0-9\-]+\t[A-Za-z0-9\-\/ ]+\t[A-Za-z0-9\-]+\t[A-Za-z0-9\-]+/g );
			console.log( dataLines );
			dataLines.forEach( function( line ) {
				var matches = line.match( /IMAGE\t([A-Za-z0-9\-]+)\t([A-Za-z0-9\-\/ ]+)\t([A-Za-z0-9\-]+)\t([A-Za-z0-9\-]+)/ );
				var info = {
					"ami": matches[1],
					"name": matches[2],
					"state": matches[4]
				};
				images.push( info );
			});
			callback( null, images );
		},
		function( errors ) {
			callback( errors, null );
		}
	);
}
/*
// Launch one new instance based on an AMI.
ec2-run-instances --region us-east-1 -n 1 -k Elastic-Nova -t t1.micro ami-0d3aba64
// That returns a bunch of information, the instance ID is in there.  (like INSTANCE  i-b0c134ce)

// Terminate an instance
ec2-terminate-instances --region us-east-1 i-b0c134ce
*/
Ec2.prototype.terminateInstance = function( region, instance, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		tool_bin + 'ec2-terminate-instances',
		[ '--region', region, instance ],
		function( output ) {
			callback( null );
		},
		function( errors ) {
			callback( errors );
		}
	);	
}
Ec2.prototype.launchInstance = function( region, image, keypair, type, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		tool_bin + 'ec2-run-instances',
		[ '--region', region, '-n', 1, '-k', keypair, '-t', type, image ],
		function( output ) {
			var instances = [];
			var dataLines = output.match( /INSTANCE\t[A-Za-z0-9\-]+/g );
			dataLines.forEach( function( line ) {
				var matches = line.match( /INSTANCE\t([A-Za-z0-9\-]+)/ );
				var info = {
					"instance": matches[1],
				};
				instances.push( info );
			});
			callback( null, instances );
		},
		function( errors ) {
			callback( errors, null );
		}
	);	
}
module.exports = exports = new Ec2();