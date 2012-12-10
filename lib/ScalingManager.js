var GROW_THRESHOLD = 70;
var SHRINK_THRESHOLD = 30;

function ScalingManager( cluster ) {
	this.cluster = cluster;
	this.scaleLevel = 0;
}
ScalingManager.prototype.reportUtilization = function( percent, count ) {
	console.log( 'elastic (' + this.cluster.config.name + ') Load on ' + count + ' instance cluster is ' + percent + '%' );
	if( percent > GROW_THRESHOLD )
	{
		if( this.scaleLevel < 30 )
			this.scaleLevel++;
	}
	else if( percent < GROW_THRESHOLD )
	{
		if( this.scaleLevel > 0 )
			this.scaleLevel--;
	}

	this._setNumberOfNodes( 1 + Math.floor( this.scaleLevel / 3 ) );
}
ScalingManager.prototype._setNumberOfNodes = function( numberOfNodes ) {
	var self = this;
	this.cluster.getNumberOfRunningNodes( function( error, count ) {
		if( count > numberOfNodes )
			self.cluster.addNode( function( error ) {
				if( !error )
					console.log( 'elastic (' + self.cluster.config.name + '): Added node.' );
				else
					console.log( 'elastic (' + self.cluster.config.name + '): Error adding node: ' + error );
			} );
		else if( count < numberOfNodes )
			self.cluster.removeNode( function( error ) {
				if( !error )
					console.log( 'elastic (' + self.cluster.config.name + '): Removed node.' );
				else
					console.log( 'elastic (' + self.cluster.config.name + '): Error removing node: ' + error );
			} );
	});
}
module.exports = ScalingManager;
