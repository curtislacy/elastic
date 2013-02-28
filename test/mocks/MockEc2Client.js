function MockEc2() {
	this.amis = [];
	this.instances = {};
	this.utilizations = {};
}
MockEc2.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
MockEc2.prototype.getAverageCPUUtilization = function( region, instanceId, callback ) {
	var self = this;
	process.nextTick( function() {
		callback( null, self.utilizations[ instanceId ] || 0 );
	});
}
MockEc2.prototype.setCPUUtilization = function( instanceId, util ) {
	this.utilizations[ instanceId ] = util;
}
MockEc2.prototype.createElasticLoadBalancer = function( name, region, zones, ports, callback ) {
};
MockEc2.prototype.deleteElasticLoadBalancer = function( name, region, callback ) {
}
MockEc2.prototype.getElasticLoadBalancers = function( region, callback ) {
}
MockEc2.prototype.addLoadBalancerAvailabilityZone = function( region, balancerName, zone, callback ) {
}
MockEc2.prototype.getBalancedInstances = function( region, balancerName, callback ) {
}
MockEc2.prototype.getRunningInstances = function( region, callback ) {
	var running = [];
	for( var i in this.instances )
		if( this.instances.hasOwnProperty( i ))
			running.push( this.instances[ i ]);

	process.nextTick( function() {
		callback( null, running );
	});
}
MockEc2.prototype.getAMIs = function( region, callback ) {
	var self = this;
	process.nextTick( function() {
		callback( null, self.amis );
	} );
}
MockEc2.prototype.setInstanceName = function( region, instance, name, callback ) {
}
MockEc2.prototype.setInstanceTag = function( region, instance, tag, value, callback ) {
}
MockEc2.prototype.terminateInstance = function( region, instance, callback ) {
	delete this.instances[ instance ];
	process.nextTick( function() {
		callback( null );
	});
}
MockEc2.prototype.launchInstance = function( region, image, keypair, type, group, callback ) {
	this.launchInstanceInAvailabilityZone( region, image, keypair, type, group, region + 'a', callback );
}
MockEc2.prototype.launchInstanceInAvailabilityZone = function( region, image, keypair, type, group, zone, callback ) {
		var newInstance = {
		instance: 'i-' + Math.floor(Math.random()*16777215).toString(16),
		ami: image,
		internal: Math.floor(Math.random()*255).toString(10) + '.' + Math.floor(Math.random()*255).toString(10) + '.' + Math.floor(Math.random()*255).toString(10) + '.' + Math.floor(Math.random()*255).toString(10),
		external: Math.floor(Math.random()*255).toString(10) + '.' + Math.floor(Math.random()*255).toString(10) + '.' + Math.floor(Math.random()*255).toString(10) + '.' + Math.floor(Math.random()*255).toString(10),
		type: type,
		zone: zone
	};
	this.instances[ newInstance.instance ] = newInstance;

	process.nextTick( function() {
		callback( null, [{
			instance: newInstance.instance
		}]);
	});
}
MockEc2.prototype.getSecurityGroups = function( region, callback ) {
}
MockEc2.prototype.createSecurityGroup = function( region, name, callback ) {
}
MockEc2.prototype.attachInstanceToLoadBalancer = function( region, instanceId, loadBalancerName, callback ) {
}
MockEc2.prototype.removeInstanceFromLoadBalancer = function( region, instanceId, loadBalancerName, callback ) {
}
MockEc2.prototype.addFirewallAllow = function( region, securityGroup, rule, callback ) {
}

MockEc2.prototype.addAMI = function( ami ) {
	this.amis.push( ami );
}
module.exports = exports = MockEc2;