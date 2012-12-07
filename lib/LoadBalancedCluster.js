var ec2 = require( './Ec2Client' );
var async = require( 'async' );

function LoadBalancedCluster( config ) {

	this.config = config;
}

LoadBalancedCluster.prototype.start = function( callback ) {
	console.log( 'elastic (' + this.config.name + '): Starting cluster.' );
	var self = this;
	async.series( [
			function( done ) {
				console.log( 'elastic (' + self.config.name + '): Checking for Security Group.' );
				self._ensureSecurityGroupExists( done );
			},
			function( done ) {
				console.log( 'elastic (' + self.config.name + '): Checking for load balancer.' );
				self._ensureLoadBalancerExists( done );
			},
			function( done ) {
				console.log( 'elastic (' + self.config.name + '): Checking for first node.')
				self._ensureFirstNodeExists( done );
			},
			function( done ) {
				console.log( 'elastic (' + self.config.name + '): Making sure existing nodes are connected to load balancer.')
				self._ensureExistingNodesAreConnected( done );
			},
		], function( err, results ) {
			if( err )
				console.log( '*** ERROR: ' + err );
			else
				console.log( 'elastic (' + self.config.name + '): Done building cluster.' );
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
	console.log( 'elastic (' + this.config.name + '): Creating Security Group.' );
				
	ec2.createSecurityGroup( this.config.region, this.config.securityGroup, function( error, result ) {
		callback( error );
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
					found = true;
			});
			callback( null, found );
		}
	});
}

LoadBalancedCluster.prototype._createLoadBalancer = function( callback ) {
	console.log( 'elastic (' + this.config.name + '): Creating load balancer.' );
	
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

LoadBalancedCluster.prototype._createFirstNode = function( callback ) {
		console.log( 'elastic (' + this.config.name + '): creating first node.' );
		ec2.launchInstance( this.config.region, this.config.ami, 
		this.config.keypair, this.config.type, function( error, result ) {
			if( error )
				callback( error );
			else
			{
				callback( null );
			}
		});
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
									console.log( 'elastic (' + self.config.name + '): connecting instance ' + instance.instance );
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