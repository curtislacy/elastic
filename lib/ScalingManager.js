var GROW_THRESHOLD = 70;
var SHRINK_THRESHOLD = 30;

function ScalingManager( cluster ) {
	this.cluster = cluster;
	this.scaleLevel = 0;
}
ScalingManager.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
ScalingManager.prototype.reportUtilization = function( percent, count ) {
	this.logger.log( 'elastic (' + this.cluster.config.name + ') Load on ' + count + ' instance cluster is ' + percent + '%' );
	if( percent > GROW_THRESHOLD )
	{
		if( this.scaleLevel < 50 )
			this.scaleLevel++;
	}
	else if( percent < SHRINK_THRESHOLD )
	{
		if( this.scaleLevel > 0 )
			this.scaleLevel--;
	}

	this._setNumberOfNodes( 1 + Math.floor( this.scaleLevel / 5 ) );
}
ScalingManager.prototype._setNumberOfNodes = function( numberOfNodes ) {
	var self = this;
	this.cluster.getNumberOfRunningNodes( function( error, count ) {
		if( count < numberOfNodes )
		{
			self.logger.log( 'elastic (' + self.cluster.config.name + '): Launching a new node.' );
			self.cluster.addNode( function( error ) {
				if( !error )
					self.logger.log( 'elastic (' + self.cluster.config.name + '): Added node.' );
				else
					self.logger.log( 'elastic (' + self.cluster.config.name + '): Error adding node: ' + error );
			} );
		}
		else if( count > numberOfNodes )
		{
			self.logger.log( 'elastic (' + self.cluster.config.name + '): Shutting down a node.' );
			self.cluster.removeNode( function( error ) {
				if( !error )
					self.logger.log( 'elastic (' + self.cluster.config.name + '): Removed node.' );
				else
					self.logger.log( 'elastic (' + self.cluster.config.name + '): Error removing node: ' + error );
			} );
		}
	});
}
module.exports = ScalingManager;
