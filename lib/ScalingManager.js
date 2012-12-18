var GROW_THRESHOLD = 80;
var SHRINK_THRESHOLD = 40;
var SCALE_STEPS_PER_NODE = 5;
var MAX_NUMBER_NODES = 10;

function ScalingManager( cluster ) {
	this.cluster = cluster;
	this.scaleLevel = -1;
}
ScalingManager.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
ScalingManager.prototype.reportUtilization = function( percent, count, callback ) {
	if( this.scaleLevel < 0 )
	{
		if( count > 0 )
			this.scaleLevel = SCALE_STEPS_PER_NODE * ( count - 1 );
		else
			this.scaleLevel = 0;
	}

	this.logger.log( 'elastic (' + this.cluster.config.name + ') Load on ' + count + ' instance cluster is ' + percent + '%' );
	if( percent > GROW_THRESHOLD )
	{
		if( this.scaleLevel < ( SCALE_STEPS_PER_NODE * MAX_NUMBER_NODES ))
			this.scaleLevel++;
	}
	else if( percent < SHRINK_THRESHOLD )
	{
		if( this.scaleLevel > 0 )
			this.scaleLevel--;
	}

	this._setNumberOfNodes( 1 + Math.floor( this.scaleLevel / SCALE_STEPS_PER_NODE ), callback );
}
ScalingManager.prototype._setNumberOfNodes = function( numberOfNodes, callback ) {
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
				callback( null );
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
				callback( null );
			} );
		}
		else
		{
			callback( null );
		}
	});
}
module.exports = ScalingManager;
