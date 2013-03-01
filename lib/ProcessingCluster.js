var async = require( 'async' );

function ProcessingCluster( elastic, config ) {
	this.ec2 = elastic.getEc2Client();
	this.Util = elastic.Util;
	this.config = config;
	this.activeSystems = {};
	this.idleSystems = {};
	this.POLL_TIME = 600000;
}
ProcessingCluster.prototype.setLogger = function( logger ) {
	this.logger = logger;
}
ProcessingCluster.prototype.setEc2Client = function( client ) {
	this.ec2 = client;
}
ProcessingCluster.prototype.setPollTime = function( milliseconds ) {
	this.POLL_TIME = milliseconds;
}
ProcessingCluster.prototype.start = function() {
	var self = this;
	function TimerTask() {
		if( !self.stopped )
			async.parallel( 
				[
					function( done ) {
						self._shutdownIdleSystems( done );
					},
					function( done ) {
						self._updateUtilizations( done );
					}
				], 
				function( error, results ) {
					setTimeout( TimerTask, self.POLL_TIME );
				} 
			);
	};
	setTimeout( TimerTask, self.POLL_TIME );
}
ProcessingCluster.prototype.stop = function() {
	this.stopped = true;
	this._terminateAllSystems();
}

/**
 * Execute the given function, which takes two arguments: a RemoteSystem, and a callback( error ).
 * Second argument is an error callback.
 **/
ProcessingCluster.prototype.process = function( func, errorFunc ) {
	var self = this;
	this._getLowUtilizationSystem( function( error, targetSystem ) {
		if( error )
			errorFunc( error );
		else
			func( targetSystem, function( error ) {
				if( error )
					log.error( 'elastic (' + self.config.name + '): Error delegating process to remote system', error );

				self._releaseSystem( targetSystem );
			});
	});
}

/**
 * Callback: function( Error, RemoteSystem ).
 * Get the lowest utilization system which has a util less than 75%.
 * If no such system exists, creates a new one and hands it back.
 * Before the system is returned, marks it as in-use so that it is not terminated.
 **/
ProcessingCluster.prototype._getLowUtilizationSystem = function( callback ) {
	var self = this;
	this._findLowUtilizationSystem( function( error, system ) {
		if( error )
			callback( error, null );
		else
		{
			if( system )
			{
				callback( error, system );
			}
			else
			{
				// If there's a system already being created, wait a second and then 
				// try this whole mess again.
				if( self.creationInProgress )
				{
					setTimeout( function() {
						self._getLowUtilizationSystem( callback );
					}, 1000 );
				}
				else
				{
					self._createNewSystem( function( error, newSystem ) {
						if( error )
							callback( error, null );
						else
							callback( null, self._markSystemInUse( newSystem ));
					});

				}
			}
		}
	});
}

ProcessingCluster.prototype._findLowUtilizationSystem = function( callback ) {

	var lowestUtil = 100;
	var lowestUtilSystem = null;

	for( var idleSystem in this.idleSystems )
	{
		if( this.idleSystems.hasOwnProperty( idleSystem ))
		{
			if( this.idleSystems[ idleSystem ].util < lowestUtil )
			{
				lowestUtil = this.idleSystems[ idleSystem ].util;
				lowestUtilSystem = this.idleSystems[ idleSystem ].system;
			}
		}
	}
	if( lowestUtil < 75 )
		callback( null, this._markSystemInUse( lowestUtilSystem ));
	else
	{
		var lowestUseCount = false;
		for( var activeSystem in this.activeSystems )
		{
			if( this.activeSystems.hasOwnProperty( activeSystem ))
			{

				if( !lowestUseCount || 
					this.activeSystems[ activeSystem ].useCount < lowestUseCount )
				{
					lowestUseCount = this.activeSystems[ activeSystem ].useCount;
					lowestUtil = this.activeSystems[ activeSystem ].util;
					lowestUtilSystem = this.activeSystems[ activeSystem ].system;
				}
				else
				{
					if( this.activeSystems[ activeSystem ].useCount == lowestUseCount &&
						this.activeSystems[ activeSystem ].util < lowestUtil )
					{
						lowestUtil = this.activeSystems[ activeSystem ].util;
						lowestUtilSystem = this.activeSystems[ activeSystem ].system;
					}
				}
			}
		}

		if( lowestUtil < 75 )
		{
			callback( null, this._markSystemInUse( lowestUtilSystem ));
		}
		else
			callback( null, null );
	}

}

/**
 * Takes the given RemoteSystem and reduces its in-use count.
 **/
ProcessingCluster.prototype._releaseSystem = function( remoteSystem ) {
	this.activeSystems[ remoteSystem.instance ].useCount--;
	if( this.activeSystems[ remoteSystem.instance ].useCount == 0 )
	{
		var systemUtil = this.activeSystems[ remoteSystem.instance ].util;
		delete this.activeSystems[ remoteSystem.instance ];
		this.idleSystems[ remoteSystem.instance ] = {
			system: remoteSystem,
			// If all our jobs are done, assume this is immediately going back down to 
			// 0 utilization, since we only get new util values every five minutes.
			util: 0,
			idleSince: ( new Date() ).getTime()
		}
	}
}

ProcessingCluster.prototype._shutdownIdleSystems = function( callback ) {
	var self = this;

	var currentTime = ( new Date() ).getTime();
	var toTerminate = [];
	for( var system in this.idleSystems )
	{
		if( this.idleSystems.hasOwnProperty( system ))
		{
			if( ( currentTime - this.idleSystems[ system ].idleSince ) > this.POLL_TIME )
				toTerminate.push( this.idleSystems[ system ].system );
		}
	}
	if( toTerminate.length > 0 )
	{
		async.forEachSeries( toTerminate, 
			function( system, done ) {
				delete self.idleSystems[ system.instance ];
				self.ec2.terminateInstance( self.config.region, system.instance, done );
			},
			function( error ) {
				callback( error );
			});
	}
	else
	{
		callback( null );
	}
}

ProcessingCluster.prototype._terminateAllSystems = function() {
	var self = this;
	var toTerminate = [];
	for( var system in idleSystems )
	{
		if( this.idleSystems.hasOwnProperty( system ))
			toTerminate.push( this.idleSystems[ system ]);
	}
	for( var system in activeSystems )
	{
		if( this.activeSystems.hasOwnProperty( system ))
			toTerminate.push( this.activeSystems[ system ]);
	}
	async.forEachSeries( toTerminate,
		function( system, done ) {
			ec2.terminateInstance( self.config.region, system.instance, function( error ) {
				if( error )
					self.logger.error( 'elastic (' + self.config.name + '): error terminating ' + system.instance, error );
				done();
			});
		},
		function( error ) {
			self.idleSystems = {};
			self.activeSystems = {};
		} );
}

ProcessingCluster.prototype._updateUtilizations = function( callback ) {
	var self = this;
	var instances = [];
	for( var i in this.activeSystems )
		if( this.activeSystems.hasOwnProperty( i ))
			instances.push( i );
	for( var i in this.idleSystems )
		if( this.activeSystems.hasOwnProperty( i ))
			instances.push( i );

	var utilLookup = {};
	async.forEachSeries( instances, 
		function( instance, done ) {
			self.ec2.getAverageCPUUtilization( self.config.region, instance, function( error, util ) {
				if( error )
					self.logger.error( 'elastic (' + self.config.name + '): error looking up % util of ' + system.instance, error );
				else
					utilLookup[ instance ] = util;
				done();
			});
		},
		function( error ) {
			for( var i in self.activeSystems )
			{
				if( self.activeSystems.hasOwnProperty( i ))
				{
					if( utilLookup.hasOwnProperty( i ))
					{
						self.activeSystems[ i ].util = utilLookup[ i ];
					}
				}
			}

			for( var i in self.idleSystems )
			{
				if( self.idleSystems.hasOwnProperty( i ))
				{
					if( utilLookup.hasOwnProperty( i ))
					{
						self.idleSystems[ i ].util = utilLookup[ i ];
					}
				}
			}
			callback( null );
		});

}

ProcessingCluster.prototype._getAvailabilityZoneCounts = function() {
	
	var counts = {};
	for( var i in this.activeSystems )
		if( this.activeSystems.hasOwnProperty( i ))
		{
			var zone = this.activeSystems[ i ].system.zone;
			if( counts[ zone ] )
				counts[ zone ]++;
			else
				counts[ zone ] = 1;
		}
	for( var i in this.idleSystems )
		if( this.idleSystems.hasOwnProperty( i ))
		{
			var zone = this.idleSystems[ i ].system.zone;
			if( counts[ zone ] )
				counts[ zone ]++;
			else
				counts[ zone ] = 1;
		}
	return counts;
}

ProcessingCluster.prototype._createNewSystem = function( callback ) {
	this.creationInProgress = true;

	var self = this;

	var zoneCounts = this._getAvailabilityZoneCounts();
	var lowestCount = null;
	var lowestZone = null;

	for( var z in zoneCounts )
		if( zoneCounts.hasOwnProperty( z ) && 
			( lowestZone == null || zoneCounts[z] < lowestCount ))
		{
			lowestCount = zoneCounts[z];
			lowestZone = z;
		}

	if( lowestZone )
	{
		this.ec2.launchInstanceInAvailabilityZone( 
			this.config.region, 
			this.config.ami,
			this.config.keypair,
			this.config.type,
			this.config.group,
			lowestZone, 
			this.Util.waitForStartup( {
				'region': self.config.region,
				'key': self.config.keyPath,
				'user': self.config.user	
			},
			function( error, launched ) {
				if( error )
					callback( error, null );
				else
				{
					self.idleSystems[ launched.instance ] = {
						system: launched,
						util: 0,
						idleSince: ( new Date() ).getTime()
					};
					self.creationInProgress = false;
					callback( null, launched );
				}
			}) );
	}
	else
	{
		this.ec2.launchInstance( 
			this.config.region, 
			this.config.ami,
			this.config.keypair,
			this.config.type,
			this.config.group,
			this.Util.waitForStartup( {
				'region': self.config.region,
				'key': self.config.keyPath,
				'user': self.config.user	
			},
			function( error, launched ) {
				if( error )
					callback( error, null );
				else
				{
					self.idleSystems[ launched.instance ] = {
						system: launched,
						util: 0,
						idleSince: ( new Date() ).getTime()
					};
					self.creationInProgress = false;
					callback( null, launched );
				}
			}) );
	}
}

ProcessingCluster.prototype._markSystemInUse = function( remoteSystem ) {
	if( this.idleSystems[ remoteSystem.instance ] )
	{
		delete this.idleSystems[ remoteSystem.instance ];
		this.activeSystems[ remoteSystem.instance ] = {
			system: remoteSystem,		
			util: 100,
			useCount: 0
		}
	}
	this.activeSystems[ remoteSystem.instance ].useCount++;
	// Default it to 100% allocated, until we hear oterhwise.
	this.activeSystems[ remoteSystem.instance ].util = 100;

	return remoteSystem;
}

module.exports = exports = ProcessingCluster;