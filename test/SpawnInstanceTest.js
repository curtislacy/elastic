var assert = require( 'assert' );

// Used to print out the results of the real code.
describe( 'Ec2Client', function() {
	/*describe( 'getAMIs', function() {
		this.timeout( 10000 );
		var elastic = new( require( '../index.js' ))();
		it( 'should return a list of AMIs', function( done ) {
			var ec2 = elastic.getEc2Client();
			console.log( ec2 );

			ec2.getAMIs( 'us-east-1', function( error, result ) {
				assert.equal( null, error );

				console.log( result );
				done();
			});
		});
	} );*/
	/*describe( 'launchInstance', function() {
		this.timeout( 10000 );
		var elastic = new( require( '../index.js' ))();
		it( 'should return data about the new instance', function( done ) {
			elastic.getEc2Client().launchInstance( 
				'us-east-1', 'ami-0d3aba64', 'EngineNLP', 't1.micro', 'default',
				function( error, result ) {
					assert.equal( null, error );

					//   [ { instance: 'i-18e2836b' } ]

					console.log( result );
					done();
				});
		} );
	});*/
	/*describe( 'launchInstanceInAvailabilityZone', function() {
		this.timeout( 10000 );
		var elastic = new( require( '../index.js' ))();
		it( 'should return data about the new instance', function( done ) {
			elastic.getEc2Client().launchInstanceInAvailabilityZone( 
				'us-east-1', 'ami-0d3aba64', 'EngineNLP', 't1.micro', 'default', 'us-east-1b',
				function( error, result ) {
					assert.equal( null, error );

					//   [ { instance: 'i-18e2836b' } ]

					console.log( result );
					done();
				});
		} );
	});*/
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
	/*			done();
			});
		});
	});*/
});

describe( 'MockEc2Client', function() {
	
	describe( 'getAMIs', function() {
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

		it( 'should return a list of AMIs', function( done ) {
			elastic.getEc2Client().getAMIs( 'us-east-1', function( error, result ) {
				assert.equal( amiList.length, result.length );
				done();
			} );
		} );
		it( 'each AMI should have an ami id, name, and state.', function( done ) {
			elastic.getEc2Client().getAMIs( 'us-east-1', function( error, result ) {
				result.forEach( function( ami ) {
					assert.ok( ami.ami );
					assert.ok( ami.name );
					assert.ok( ami.state );
				});
				done();
			} );
		} );

	});

	describe( 'getRunningInstances',function() {
		describe( 'with no started instances', function() {
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
			it( 'should return no running instances', function( done ) {
				elastic.getEc2Client().getRunningInstances( 'us-east-1', function( error, result ) {
					assert.equal( 0, result.length );
					done();
				});
			} );
		});
		describe( 'with a single started instance', function() {
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
			it( 'should return a single instance with the right information', function( done ) {
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
						elastic.getEc2Client().getRunningInstances( 'us-east-1', function( error, result ) {
							assert.equal( 1, result.length );
							assert.ok( result[0].instance );
							assert.equal( data.ami, result[0].ami );
							assert.ok( result[0].internal );
							assert.ok( result[0].external );
							assert.equal( data.type, result[0].type );
							assert.ok( result[0].zone );
							done();
						});
					} );
			} );
		});
	});

	describe( 'launchInstance', function() {
		it( 'should return an instance ID.', function( done ) {
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
			elastic.getEc2Client().launchInstance( 
				'us-east-1', 'ami-0d3aba64', 'EngineNLP', 't1.micro', 'default',
				function( error, result ) {
					assert.equal( error, null );
					assert.equal( 1, result.length );
					assert.ok( result[0].instance );
					done();
				} );
		} );
	});

	describe( 'launchInstanceInAvailabilityZone', function() {
		it( 'should return an instance ID.', function( done ) {
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
			elastic.getEc2Client().launchInstanceInAvailabilityZone( 
				'us-east-1', 'ami-0d3aba64', 'EngineNLP', 't1.micro', 'default', 'us-east-1b',
				function( error, result ) {
					assert.equal( error, null );
					assert.equal( 1, result.length );
					assert.ok( result[0].instance );
					done();
				} );
		} );
		it( 'should launch the instance in the right zone.', function( done ) {
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
			var data = {
				region: 'us-east-1',
				ami: 'ami-0d3aba64',
				key: 'EngineNLP',
				type: 't1.micro',
				group: 'default',
				zone: 'us-east-1c'
			}
			elastic.getEc2Client().launchInstanceInAvailabilityZone( 
				data.region, data.ami, data.key, data.type, data.group, data.zone,
				function( error, result ) {
					assert.equal( error, null );
					elastic.getEc2Client().getRunningInstances( 'us-east-1', function( error, result ) {
							assert.equal( 1, result.length );
							assert.ok( result[0].instance );
							assert.equal( data.ami, result[0].ami );
							assert.ok( result[0].internal );
							assert.ok( result[0].external );
							assert.equal( data.type, result[0].type );
							assert.equal( data.zone, result[0].zone );
							done();
						});
				} );
		} );	});
} );