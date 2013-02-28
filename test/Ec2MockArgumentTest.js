var assert = require( 'assert' );

describe( 'MockEc2', function() {
	var mock = new( require( './mocks/MockEc2Client' ))();

	describe( 'getAverageCPUUtilization', function() {
		it( 'returns an error if region is not specified', function( done ) {
			mock.getAverageCPUUtilization( null, null, function( error, result ) {
				assert.ok( error );
				done();
			});
		});
	} );

	describe( 'getRunningInstances', function() {
		it( 'returns an error if region is not specified', function( done ) {
			mock.getRunningInstances( null, function( error, result ) {
				assert.ok( error );
				done();
			});
		});
	} );

	describe( 'getAMIs', function() {
		it( 'returns an error if region is not specified', function( done ) {
			mock.getAMIs( null, function( error, result ) {
				assert.ok( error );
				done();
			});
		});
	} );

	describe( 'terminateInstance', function() {
		it( 'returns an error if region is not specified', function( done ) {
			mock.terminateInstance( null, null, function( error, result ) {
				assert.ok( error );
				done();
			});
		});
	} );

	describe( 'launchInstance', function() {
		it( 'returns an error if region is not specified', function( done ) {
			mock.launchInstance( null, null, null, null, null, function( error, result ) {
				assert.ok( error );
				done();
			});
		});
	} );

	describe( 'launchInstanceInAvailabilityZone', function() {
		it( 'returns an error if region is not specified', function( done ) {
			mock.launchInstanceInAvailabilityZone( null, null, null, null, null, null, function( error, result ) {
				assert.ok( error );
				done();
			});
		});
	} );

} );