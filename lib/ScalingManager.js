function ScalingManager( cluster ) {
	this.cluster = cluster;
}
ScalingManager.prototype.reportUtilization = function( percent, count ) {
	console.log( 'elastic (' + this.cluster.config.name + ') Load on ' + count + ' instance cluster is ' + percent + '%' );
}
module.exports = ScalingManager;
