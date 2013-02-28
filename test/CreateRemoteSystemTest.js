// Change this based on your particular setup.
/*process.env.JAVA_HOME = '/System/Library/Frameworks/JavaVM.framework/Home/';

process.env.EC2_PRIVATE_KEY = __dirname + '/keys/pk-TQ2TH4KSYVEHHGJJG5KMQX5PLU662GQA.pem';
process.env.EC2_CERT = __dirname + '/keys/cert-TQ2TH4KSYVEHHGJJG5KMQX5PLU662GQA.pem';
*/
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
			elastic.getEc2Client().launchInstance( 
				'us-east-1', 'ami-0d3aba64', 'EngineNLP', 't1.micro', 'default',
				elastic.Util.waitForStartup( {
					'region': 'us-east-1',
					'key': '/Dummy/Key/Path.pem',
					'user': 'ubuntu'
				},
				function( error, launched ) {
					console.log( error );
					assert.equal( null, error );
					done();
				}) );
		});
	});
});