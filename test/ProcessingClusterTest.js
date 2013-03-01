var assert = require( 'assert' );
var async = require( 'async' );

describe( 'ProcessingCluster', function() {
	describe( 'when started and given a task to process', function() {
		var elastic = new( require( '../index.js' ))();
		var mockClient = new( require( './mocks/MockEc2Client' ))();
		elastic.setEc2Client( mockClient );
		var mockProcessor = require( './mocks/MockProcess' );
		var startTime = new Date().valueOf();
		mockProcessor.setCommandHandler( 'ssh', function( args, successCallback, failureCallback ) {
			successCallback( '23:47  up 6 days, 14:37, 2 users, load averages: 0.69 0.64 0.53' );
		});
		elastic.setProcessHandler( mockProcessor );

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
		it( 'will provide a RemoteSystem to process that task', function( done ) {
			var cluster = elastic.ProcessingCluster( {
				region: 'us-east-1',
				ami: 'ami-d19413b8',
				keypair: 'NOVA-Util',
				type: 't1.micro',
				group: 'default',
				keyPath: '/dummy/path/to/key.pem',
				user: 'ubuntu'
			});
			cluster.start();
			cluster.process( function( remote, clusterDone ) {
				assert.ok( remote );
				clusterDone();
				process.nextTick( function() {
					done();
				});
			},
			function( error ) {
				throw new Error( 'Error was returned: ' + require( 'util' ).inspect( error ) );
			});
		} );
	} );
	describe( 'when started and given two tasks to process in close succession', function() {
		this.timeout( 10000 );

		var elastic = new( require( '../index.js' ))();
		var mockClient = new( require( './mocks/MockEc2Client' ))();
		elastic.setEc2Client( mockClient );
		var mockProcessor = require( './mocks/MockProcess' );
		var startTime = new Date().valueOf();
		mockProcessor.setCommandHandler( 'ssh', function( args, successCallback, failureCallback ) {
			if( new Date().valueOf() - startTime > 1000 )
				successCallback( '23:47  up 6 days, 14:37, 2 users, load averages: 0.69 0.64 0.53' );
			else
				failureCallback( 'Not started yet.' );
		});
		elastic.setProcessHandler( mockProcessor );

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
		var clusterConfig = {
			region: 'us-east-1',
			ami: 'ami-rapidsuccession',
			keypair: 'NOVA-Util',
			type: 't1.micro',
			group: 'default',
			keyPath: '/dummy/path/to/key.pem',
			user: 'ubuntu'
		}
		var cluster = elastic.ProcessingCluster( clusterConfig );
		cluster.setPollTime( 3000 );
		cluster.start();

		it( 'will provide the same RemoteSystem to both processors', function( done ) {

			var remote1;
			var remote2;

			async.parallel( [
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							remote1 = remote;
							clusterDone();
							localDone();
						});
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								remote2 = remote;
								clusterDone();
								localDone();
							});

						}, 1000 );
					},
				],
				function( error ) {
					assert.ok( remote1 );
					assert.ok( remote2 );
					assert.deepEqual( remote1, remote2 );
					done();
				} );
		} );
	} );
	describe( 'when has had to start an instance', function() {
		this.timeout( 10000 );

		var elastic = new( require( '../index.js' ))();
		var mockClient = new( require( './mocks/MockEc2Client' ))();
		elastic.setEc2Client( mockClient );
		var mockProcessor = require( './mocks/MockProcess' );
		var startTime = new Date().valueOf();
		mockProcessor.setCommandHandler( 'ssh', function( args, successCallback, failureCallback ) {
			if( new Date().valueOf() - startTime > 3000 )
				successCallback( '23:47  up 6 days, 14:37, 2 users, load averages: 0.69 0.64 0.53' );
			else
				failureCallback( 'Not started yet.' );
		});
		elastic.setProcessHandler( mockProcessor );

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
		var clusterConfig = {
			region: 'us-east-1',
			ami: 'ami-d19413b8',
			keypair: 'NOVA-Util',
			type: 't1.micro',
			group: 'default',
			keyPath: '/dummy/path/to/key.pem',
			user: 'ubuntu'
		}
		var cluster = elastic.ProcessingCluster( clusterConfig );
		cluster.setPollTime( 1000 );
		cluster.start();

		it( 'will clean up its instances when it\'s done', function( done ) {

			// First, kick off the series of callbacks that checks the number of
			// systems in the cluster.
			function checkForInstancesCreated() {
				elastic.getEc2Client().getRunningInstances( clusterConfig.region, function( error, result ) {
					assert.equal( null, error );
					if( result.length > 0 )
						checkForInstancesCleanedUp();
					else
						setTimeout( checkForInstancesCreated, 100 );
				});
			};
			function checkForInstancesCleanedUp() {
				elastic.getEc2Client().getRunningInstances( clusterConfig.region, function( error, result ) {
					assert.equal( null, error );
					if( result.length == 0 )
						done();
					else
						setTimeout( checkForInstancesCleanedUp, 500 );
				});
			}
			checkForInstancesCreated();

			// Then, actually submit a couple of jobs.
			async.parallel( [
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							setTimeout( function() {
								clusterDone();
								localDone();

							}, 1000 );
						});
					},
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							setTimeout( function() {
								clusterDone();
								localDone();

							}, 800 );
						});
					},
				],
				function( error ) {
			} );
		} );
	});
	describe( 'when given tasks that peg CPU', function() {
		this.timeout( 30000 );

		var elastic = new( require( '../index.js' ))();
		var mockClient = new( require( './mocks/MockEc2Client' ))();
		elastic.setEc2Client( mockClient );
		var mockProcessor = require( './mocks/MockProcess' );
		var startTime = new Date().valueOf();
		mockProcessor.setCommandHandler( 'ssh', function( args, successCallback, failureCallback ) {
			if( new Date().valueOf() - startTime > 1000 )
				successCallback( '23:47  up 6 days, 14:37, 2 users, load averages: 0.69 0.64 0.53' );
			else
				failureCallback( 'Not started yet.' );
		});
		elastic.setProcessHandler( mockProcessor );

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
		var clusterConfig = {
			region: 'us-east-1',
			ami: 'ami-CPUpeg',
			keypair: 'NOVA-Util',
			type: 't1.micro',
			group: 'default',
			keyPath: '/dummy/path/to/key.pem',
			user: 'ubuntu'
		}
		var cluster = elastic.ProcessingCluster( clusterConfig );
		cluster.setPollTime( 1000 );
		cluster.start();

		it( 'separate servers are launched for each task.', function( done ) {
			var remotes = [];

			async.parallel( [
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							mockClient.setCPUUtilization( remote.instance, 100 );
							remotes.push( remote );
							setTimeout( function() {
								clusterDone();
								localDone();
							}, 10000 );

						});
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 100 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 10000 );

							});
						}, 1000 );
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 100 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 10000 );

							});
						}, 2000 );
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 100 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 10000 );

							});
						}, 3000 );
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 100 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 10000 );

							});
						}, 4000 );
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 100 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 10000 );

							});
						}, 5000 );
					},
				],
				function( error ) {
					var distinct = [];
					remotes.forEach( function( i ) {
						if( distinct.indexOf( i.instance ) < 0 )
							distinct.push( i.instance );
					} );
					assert.equal( 6, distinct.length );
					done();
				} );
		} );
	} );
	describe( 'when given tasks that only partially use CPU, separated by time', function() {
		this.timeout( 30000 );

		var elastic = new( require( '../index.js' ))();
		var mockClient = new( require( './mocks/MockEc2Client' ))();
		elastic.setEc2Client( mockClient );
		var mockProcessor = require( './mocks/MockProcess' );
		var startTime = new Date().valueOf();
		mockProcessor.setCommandHandler( 'ssh', function( args, successCallback, failureCallback ) {
			if( new Date().valueOf() - startTime > 1000 )
				successCallback( '23:47  up 6 days, 14:37, 2 users, load averages: 0.69 0.64 0.53' );
			else
				failureCallback( 'Not started yet.' );
		});
		elastic.setProcessHandler( mockProcessor );

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
		var clusterConfig = {
			region: 'us-east-1',
			ami: 'ami-50%',
			keypair: 'NOVA-Util',
			type: 't1.micro',
			group: 'default',
			keyPath: '/dummy/path/to/key.pem',
			user: 'ubuntu'
		}
		var cluster = elastic.ProcessingCluster( clusterConfig );
		cluster.setPollTime( 1000 );
		cluster.start();

		it( 'servers can be reused.', function( done ) {
			var remotes = [];

			async.parallel( [
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							mockClient.setCPUUtilization( remote.instance, 50 );
							remotes.push( remote );
							setTimeout( function() {
								clusterDone();
								localDone();
							}, 5000 );

						});
					},
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							mockClient.setCPUUtilization( remote.instance, 50 );
							remotes.push( remote );
							setTimeout( function() {
								clusterDone();
								localDone();
							}, 5000 );

						});
					},
					function( localDone ) {
						cluster.process( function( remote, clusterDone ) {
							mockClient.setCPUUtilization( remote.instance, 50 );
							remotes.push( remote );
							setTimeout( function() {
								clusterDone();
								localDone();
							}, 5000 );

						});
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 50 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 5000 );

							});

						}, 3000 );
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 50 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 5000 );

							});

						}, 3000 );
					},
					function( localDone ) {
						setTimeout( function() {
							cluster.process( function( remote, clusterDone ) {
								mockClient.setCPUUtilization( remote.instance, 50 );
								remotes.push( remote );
								setTimeout( function() {
									clusterDone();
									localDone();
								}, 5000 );

							});

						}, 3000 );
					},
				],
				function( error ) {
					var distinct = [];
					remotes.forEach( function( i ) {
						if( distinct.indexOf( i.instance ) < 0 )
							distinct.push( i.instance );
					} );
					assert.equal( 3, distinct.length );
					done();
				} );
		} );
	} );
});
