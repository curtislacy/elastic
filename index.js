var moment = require( 'moment' );

process.env.EC2_HOME = __dirname + '/ec2-api-tools-1.6.5.2';
process.env.AWS_CLOUDWATCH_HOME = __dirname + '/CloudWatch-1.0.13.4';
process.env.AWS_ELB_HOME = __dirname + '/ElasticLoadBalancing-1.0.17.0';

var ec2_bin = process.env.EC2_HOME + '/bin/';
var cloudwatch_bin = process.env.AWS_CLOUDWATCH_HOME + '/bin/';
var elb_bin = process.env.AWS_ELB_HOME + '/bin/';

function Ec2() {
}
//./mon-get-stats CPUUtilization --namespace "AWS/EC2" --statistics "Minimum,Maximum,Average" --headers --period 60 --dimensions "InstanceId=i-37211948"
Ec2.prototype.getAverageCPUUtilization = function( region, instanceId, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		cloudwatch_bin + 'mon-get-stats',
		[ 
			'CPUUtilization',
			'--namespace', '"AWS/EC2"', 
			'--statistics', '"Average"', 
			'--headers' ,
			'--period', 60,
			'--region', region,
			'--dimensions', '"InstanceId=' + instanceId + '"' ],
		function( output ) {
			var newestEntry = null;

			var dataLines = output.match( /[0-9\-]+ [0-9:]+ +[0-9\.]+ +Percent/g );
			dataLines.forEach( function( line ) {
				var splitData = line.match( /([0-9\-]+ [0-9:]+) +([0-9\.]+) +Percent/ );

				var date = moment( splitData[1] );
				if( !newestEntry || date.valueOf() > newestEntry.timestamp )
					newestEntry = {
						"timestamp": date.valueOf(),
						"percent": splitData[2]
					};
			});
			
			callback( null, newestEntry.percent );
		},
		function( errors ) {
			callback( errors, null );
		}
	);	
}
Ec2.prototype.getElasticLoadBalancers = function( region, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		elb_bin + 'elb-describe-lbs',
		[ 
			'--region', region
		],
		function( output ) {
			var balancers = [];
			var dataLines = output.match( /LOAD_BALANCER +[A-Za-z0-9\-]+ +[A-Za-z0-9\-\.]+/g );
			dataLines.forEach( function( line ) {
				var matches = line.match( /LOAD_BALANCER +([A-Za-z0-9\-]+) +([A-Za-z0-9\-\.]+)/ );
				var info = {
					"name": matches[1],
					"external": matches[2]
				};
				balancers.push( info );
			});
			callback( null, balancers );
		},
		function( errors ) {
			callback( errors, null );
		}
	);		
}
Ec2.prototype.getBalancedInstances = function( region, balancerName, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		elb_bin + 'elb-describe-instance-health',
		[ 
			balancerName,
			'--region', region
		],
		function( output ) {
			var instances = [];
			var dataLines = output.match( /INSTANCE_ID +[A-Za-z0-9\-]+ +[A-Za-z0-9\-\.]+/g );
			dataLines.forEach( function( line ) {
				var matches = line.match( /INSTANCE_ID +([A-Za-z0-9\-]+) +([A-Za-z0-9\-\.]+)/ );
				var info = {
					"instance": matches[1],
					"state": matches[2]
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
Ec2.prototype.getRunningInstances = function( region, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		ec2_bin + 'ec2-describe-instances',
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
		ec2_bin + 'ec2-describe-images',
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
Ec2.prototype.terminateInstance = function( region, instance, callback ) {
	( require( './lib/SpawnProcess' ) )( 
		ec2_bin + 'ec2-terminate-instances',
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
		ec2_bin + 'ec2-run-instances',
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