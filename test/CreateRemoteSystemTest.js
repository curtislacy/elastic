var assert = require( 'assert' );

describe( 'InstanceUtil', function() {
	describe( 'waitForStartup', function() {
		this.timeout( 30000 );
		it( 'calls its callback when the RemoteSystem is ready.', function( done ) {
			var elastic = new( require( '../index.js' ))();
			var mockClient = new( require( './mocks/MockEc2Client' ))();
			elastic.setEc2Client( mockClient );
			var mockProcessor = require( './mocks/MockProcess' );
			var startTime = new Date().valueOf();
			mockProcessor.setCommandHandler( 'ssh', function( args, successCallback, failureCallback ) {
				if( new Date().valueOf() - startTime > 10 )
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
			var data = {
				region: 'us-east-1', 
				ami: 'ami-0d3aba64',
				key: 'EngineNLP',
				type: 't1.micro',
				group: 'default'
			}
			elastic.getEc2Client().launchInstance( 
				data.region, data.ami, data.key, data.type, data.group,
				elastic.Util.waitForStartup( {
					'region': 'us-east-1',
					'key': '/Dummy/Key/Path.pem',
					'user': 'ubuntu'
				},
				function( error, launched ) {
					assert.equal( null, error );
					assert.ok( launched.instance );
					assert.equal( data.ami, launched.ami );
					assert.ok( launched.internal );
					assert.ok( launched.external );
					assert.equal( data.type, launched.type );
					assert.ok( launched.zone );
					done();
				}) );
		});
	});
});