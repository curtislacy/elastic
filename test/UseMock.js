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
			var mockClient = new( require( './mocks/MockEc2Client' ))();
			var elastic = new( require( '../index.js' ))();
			elastic.setEc2Client( mockClient );
			it( 'and it should be stored at the top level', function() {
				assert.strictEqual( mockClient, elastic.getEc2Client() );
			});
			it( 'and that should show up in the LoadBalancedCluster', function() {
				assert.strictEqual( mockClient, elastic.LoadBalancedCluster().getEc2Client() );
			} );
			it( 'and that should be made available to InstanceUtil', function() {
				assert.strictEqual( mockClient, elastic.Util.getEc2Client() );
			});
		} );
	});
	describe( 'setProcessHandler', function() {
		describe( 'should allow me to specify the handler that will deal with spawning native processes', function() {
			var mockProcess = require( './mocks/MockProcess' );
			var elastic = new ( require( '../index.js' ))();
			elastic.setProcessHandler( mockProcess );
			it( 'and that should be made available to RemoteSystems', function() {
				assert.strictEqual( mockProcess, elastic.RemoteSystem().getProcessHandler() );
			});
			it( 'and that should be made available to InstanceUtil', function() {
				assert.strictEqual( mockProcess, elastic.Util.getProcessHandler() );
			});

		});
	});
});