var assert = require( 'assert' );
// Used to print out the results of the real code.
describe( 'Ec2Client', function() {
	/*describe( 'getRunningInstances', function() {
		this.timeout( 10000 );
		var elastic = new( require( '../index.js' ))();
		it( 'should return data about the running instances', function( done ) {
			elastic.getEc2Client().getRunningInstances( 'us-east-1', function( error, result ) {
				assert.equal( null, error );
				console.log( result );

				/* 
						[ { instance: 'i-37211948',
						    ami: 'ami-3d4ff254',
						    external: 'ec2-50-16-82-212.compute-1.amazonaws.com',
						    internal: 'ip-10-144-5-154.ec2.internal',
						    type: 'm1.small',
						    zone: 'us-east-1b' },
						  { instance: 'i-18e2836b',
						    ami: 'ami-0d3aba64',
						    external: 'ec2-23-22-26-181.compute-1.amazonaws.com',
						    internal: 'domU-12-31-39-0A-49-B7.compute-1.internal',
						    type: 't1.micro',
						    zone: 'us-east-1a' } ]
						    */
				/*done();
			});
		});
	});*/
	/*describe( 'getAverageCPUUtilization', function() {
		this.timeout( 10000 );
		var elastic = new( require( '../index.js' ))();
		it( 'should return the percent utilization for a given instance.', function( done ) {
			elastic.getEc2Client().getAverageCPUUtilization( 'us-east-1', 'i-37211948', function( error, result ) {
				assert.equal( null, error );
				console.log( result );

				// 3.79435

				done();
			});
		} );
	});*/
});

describe( 'MockEc2Client', function() {
	describe( 'getAverageCPUUtilization', function() {
		var elastic = new( require( '../index.js' ))();
			var mockClient = new( require( './mocks/MockEc2Client' ))();
			elastic.setEc2Client( mockClient );

			var amiList = [
				{
					ami: 'ami-0d3aba64',
					name: '786957358285/NLP Prototype Image',
					state: 'available'
				},
				{
					ami: 'ami-d19413b8',
					name: '786957358285/Cassandra Backup 2',
					state: 'available'
				}
			];
			amiList.forEach( function( ami ) {
				mockClient.addAMI( ami );
			});

			it( 'returns the utilization values I set', function( done ) {
			var data = {
					region: 'us-east-1',
					ami: 'ami-0d3aba64',
					key: 'EngineNLP',
					type: 't1.micro',
					group: 'default'
				}
				elastic.getEc2Client().launchInstance( 
					data.region, data.ami, data.key, data.type, data.group,
					function( error, result ) {
						assert.equal( error, null );
						var instance = result.instance;
						elastic.getEc2Client().getAverageCPUUtilization( 
							data.region, instance, function( error, util ) {
								assert.equal( 0, util );
								mockClient.setCPUUtilization( instance, 50 );
								elastic.getEc2Client().getAverageCPUUtilization( 
									data.region, instance, function( error, util ) {
										assert.equal( 50, util );
										done();
									} );
								} );
							});
				});
		});
} );
