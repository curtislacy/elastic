var ec2 = require( './Ec2Client' );
var ScalingManager = require( './ScalingManager.js' );
var async = require( 'async' );

function LoadBalancedCluster( config ) {
	this.config = config;
	this.scalingManager = new ScalingManager( this );
}
LoadBalancedCluster.prototype.setLogger = function( logger ) {
	this.logger = logger;
	this.scalingManager.setLogger( logger );
}
LoadBalancedCluster.prototype.start = function( callback ) {
	this.logger.log( 'elastic (' + this.config.name + '): Starting cluster.' );
	var self = this;
	async.series( [
			function( done ) {
				self.logger.log( 'elastic (' + self.config.name + '): Checking for Security Group.' );
				self._ensureSecurityGroupExists( done );
			},
			function( done ) {
				self.logger.log( 'elastic (' + self.config.name + '): Checking for load balancer.' );
				self._ensureLoadBalancerExists( done );
			},
			function( done ) {
				self.logger.log( 'elastic (' + self.config.name + '): Checking for first node.')
				self._ensureFirstNodeExists( done );
			},
			function( done ) {
				self.logger.log( 'elastic (' + self.config.name + '): Making sure existing nodes are connected to load balancer.')
				self._ensureExistingNodesAreConnected( done );
			},
		], function( err, results ) {
			if( err )
			{
				self.logger.log( '*** ERROR: ' + err );
				callback( err, null );
			}
			else
			{
				self.logger.log( 'elastic (' + self.config.name + '): Done building cluster.' );

				function pollForUtilization() {
					ec2.getBalancedInstances( 
						self.config.region, self.config.name, 
						function( error, instances ) {
							if( error )
							{
								self.logger.log( error );
								setTimeout( pollForUtilization, 300000 );
							}
							else
							{
								var count = 0;
								var sum = 0;
								async.forEachSeries( instances, 
									function( instance, done ) {
										if( instance.state == 'InService' )
										{
											ec2.getAverageCPUUtilization( 
												self.config.region, instance.instance,
												function( error, percent ) {
													if( error )
														done();
													else
													{
														count++;
														sum += percent;
														done();
													}
												} );
										}
										else
											done();
									}, 
									function( error ) {
										if( error )
											self.logger.log( error );
										
										if( count > 0 )
											self.scalingManager.reportUtilization( sum / count, count );

										setTimeout( pollForUtilization, 300000 );
									});
							}
						} );

				};
				setTimeout( pollForUtilization, 1000 );
				callback( null, self.externalDns );
			}
		} 
	);
}

LoadBalancedCluster.prototype._ensureSecurityGroupExists = function( callback ) {
	var self = this;
	this._checkSecurityGroupExists( function( error, exists ) {
		if( error )
			callback( error );
		else
		{
			if( exists )
				callback( null );
			else
				self._createSecurityGroup( callback );
		}
	} );
}

LoadBalancedCluster.prototype._checkSecurityGroupExists = function( callback ) {
	var self = this;
	ec2.getSecurityGroups( this.config.region, function( error, groups ) {
		if( error )
			callback( error, null );
		else
		{
			var found = false;
			groups.forEach( function( g ) {
				if( g.name == self.config.securityGroup )
					found = true;
			});
			callback( null, found );
		}
	});
}

LoadBalancedCluster.prototype._createSecurityGroup = function( callback ) {
	this.logger.log( 'elastic (' + this.config.name + '): Creating Security Group.' );
				
	var self = this;
	ec2.createSecurityGroup( this.config.region, this.config.securityGroup, function( error, result ) {
		if( error )
			callback( error );
		else
			async.forEachSeries( self.config.firewallAllow, 
				function( rule, done ) {
					ec2.addFirewallAllow( self.config.region, self.config.securityGroup, rule, done );
				},
				callback
			);
	});
}

LoadBalancedCluster.prototype._ensureLoadBalancerExists = function( callback ) {
	var self = this;
	this._checkLoadBalancerExists( function( error, exists ) {
		if( error )
			callback( error );
		else
		{
			if( exists )
				callback( null );
			else
				self._createLoadBalancer( callback );
		}
	} );
}

LoadBalancedCluster.prototype._checkLoadBalancerExists = function( callback ) {
	var self = this;
	ec2.getElasticLoadBalancers( this.config.region, function( error, balancers ) {
		if( error )
			callback( error, null );
		else
		{
			var found = false;
			balancers.forEach( function( balancer ) {
				if( balancer.name == self.config.name )
				{
					found = true;
					self.externalDns = balancer.external;
				}
			});
			callback( null, found );
		}
	});
}

LoadBalancedCluster.prototype._createLoadBalancer = function( callback ) {
	this.logger.log( 'elastic (' + this.config.name + '): Creating load balancer.' );

	var self = this;
	
	ec2.createElasticLoadBalancer( 
		this.config.name, 
		this.config.region, 
		this.config.zones, 
		[ {
			"protocol": this.config.protocol,
			"inputPort": this.config.externalPort,
			"outputPort": this.config.internalPort
		} ], 
		function( error, result ) {
			if( !error )
			{
				self.externalDns = result[0].external;
			}
			callback( error );
		} );
}

LoadBalancedCluster.prototype._ensureFirstNodeExists = function( callback ) {
	var self = this;
	this._checkFirstNodeExists( function( error, exists ) {
		if( error )
			callback( error );
		else
		{
			if( exists )
				callback( null );
			else
				self._createFirstNode( callback );
		}
	} );
}

LoadBalancedCluster.prototype._checkFirstNodeExists = function( callback ) {
	var self = this;
	ec2.getRunningInstances( this.config.region, function( error, instances ) {
		if( error )
			callback( error );
		else
		{
			var found = false;
			instances.forEach( function( instance ) {
				if( instance.ami == self.config.ami )
					found = true;
			});
			callback( null, found );
		}
	});
}

LoadBalancedCluster.prototype._launchNewNode = function( callback ) {
	ec2.launchInstance( this.config.region, this.config.ami, 
		this.config.keypair, this.config.type, this.config.securityGroup, 
		function( error, result ) {
			if( error )
				callback( error, null );
			else
			{
				callback( null, result );
			}
		});
}

LoadBalancedCluster.prototype._createFirstNode = function( callback ) {
	this.logger.log( 'elastic (' + this.config.name + '): creating first node.' );
	this._launchNewNode( callback );
}

LoadBalancedCluster.prototype.addNode = function( callback ) {
	var self = this;
	this._launchNewNode( function( error, instances ) {
		if( error )
			callback( error );
		else
		{
			ec2.attachInstanceToLoadBalancer( 
				self.config.region, instances[0].instance, self.config.name,
				function( error, result ) {
					callback( error );
				}
			);
		}
	});
}
LoadBalancedCluster.prototype.getNumberOfRunningNodes = function( callback ) {
	ec2.getBalancedInstances( this.config.region, this.config.name, function( error, balanced ) {
		if( error )
			callback( error, -1 );
		else
			callback( null, balanced.length );
	} );
}
LoadBalancedCluster.prototype.removeNode = function( callback ) {
	var self = this;
	ec2.getBalancedInstances( self.config.region, self.config.name, function( error, balanced ) {
		if( error )
			callback( error );
		else
		{
			if( balanced.length > 1 )
			{
				ec2.removeInstanceFromLoadBalancer( self.config.region, balanced[0].instance, self.config.name, function( error, result ) {
					if( error )
						callback( error );
					else
					{
						ec2.terminateInstance( self.config.region, balanced[0].instance, function( error, result ) {
							callback( error );
						} );
					}
				} );
			}
		}
	} );
}

LoadBalancedCluster.prototype._ensureExistingNodesAreConnected = function( callback ) {
	var self = this;
	ec2.getBalancedInstances( self.config.region, self.config.name, function( error, balanced ) {
		if( error )
			callback( error );
		else
		{
			ec2.getRunningInstances( self.config.region, function( error, instances ){
				if( error )
					callback( error );
				else
				{
					async.forEachSeries( instances, 
						function( instance, done ) {
							if( instance.ami == self.config.ami )
							{
								var found = false;
								balanced.forEach( function( b ) {
									if( b.instance == instance.instance )
										found = true;
								});
								if( found )
									done();
								else
								{
									self.logger.log( 'elastic (' + self.config.name + '): connecting instance ' + instance.instance );
									ec2.attachInstanceToLoadBalancer( 
										self.config.region, instance.instance, self.config.name,
										function( error, result ) {
											done( error );
										});
								}
							}
							else
							{
								done();
							}
						},
						callback
					);			
				}
			} );
		}
	});
}

module.exports = exports = LoadBalancedCluster;