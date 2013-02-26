var assert = require( 'assert' );

describe( 'Elastic', function() {
	describe( 'require', function() {
		it( 'should get the elastic library', function() {
			var elastic = require( '../index.js' );
			assert.notEqual( null, elastic );
		} );
	} );
	describe( 'setEc2Client', function() {
		describe( 'should allow me to set the Ec2Client to use', function() {
			var mockClient = require( './mocks/MockEc2Client' );
			var elastic = require( '../index.js' );
			elastic.setEc2Client( mockClient );
			it( 'and it should be stored at the top level', function() {
				assert.strictEqual( mockClient, elastic.getEc2Client() );
			});
			it( 'and that should show up in the LoadBalancedCluster', function() {
				assert.strictEqual( mockClient, ( new elastic.LoadBalancedCluster() ).getEc2Client() );
			} );
		} );
	});
});