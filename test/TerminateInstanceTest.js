var assert = require( 'assert' );

// Used to print out the results of the real code.
/*describe( 'Ec2Client', function() {
	describe( 'terminateInstance', function() {
		this.timeout( 30000 );
		var elastic = new( require( '../index.js' ))();
		it( 'should just return a null error if successful', function( done ) {
			elastic.getEc2Client().terminateInstance( 
				'us-east-1', 'i-58dcbd2b',
				function( error ) {
					assert.equal( null, error );
					done();
				});
		} );
	});
} );*/
describe( 'MockEc2Client', function() {
	describe( 'terminateInstance', function() {
		it( 'should return a null error and remove the instance.', function( done ) {
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
					var instanceId = result[0].instance;
					elastic.getEc2Client().getRunningInstances( 'us-east-1', function( error, result ) {
						assert.equal( 1, result.length );
						elastic.getEc2Client().terminateInstance( 'us-east-1', instanceId, function( error ) {
							assert.equal( null, error );
							elastic.getEc2Client().getRunningInstances( 'us-east-1', function( error, result ) {
								assert.equal( 0, result.length );
								done();
							});
						} );
					});
				} );

		} );
	});
});