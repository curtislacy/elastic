function MockEc2() {
}
MockEc2.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
MockEc2.prototype.getAverageCPUUtilization = function( region, instanceId, callback ) {
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
}
MockEc2.prototype.getAMIs = function( region, callback ) {
}
MockEc2.prototype.setInstanceName = function( region, instance, name, callback ) {
}
MockEc2.prototype.setInstanceTag = function( region, instance, tag, value, callback ) {
}
MockEc2.prototype.terminateInstance = function( region, instance, callback ) {
}
MockEc2.prototype.launchInstance = function( region, image, keypair, type, group, callback ) {
}
MockEc2.prototype.launchInstanceInAvailabilityZone = function( region, image, keypair, type, group, zone, callback ) {
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
module.exports = exports = new MockEc2();