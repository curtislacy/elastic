var ec2 = require( './Ec2Client' );
var Util = require( './InstanceUtil' );
var async = require( 'async' );

function ProcessingCluster( config ) {
	this.config;
	this.activeSystems = {};
	this.idleSystems = {};
}
ProcessingCluster.prototype.setLogger = function( logger ) {
	this.logger = logger;
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
					setTimeout( TimerTask, 600000 );
				} 
			);
		});
	setTimeout( TimerTask, 60000 );
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
			func( targetSystem( function( error ) {
				if( error )
					log.error( 'elastic (' + self.config.name + '): Error delegating process to remote system', error );
				self._releaseSystem( targetSystem );
			}));
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
				callback( error, system );
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
			callback( null, this._markSystemInUse( lowestUtilSystem ));
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
			util: systemUtil,
			idleSince: ( new Date() ).getTime()
		}
	}
}

ProcessingCluster.prototype._shutdownIdleSystems = function( callback ) {
	var self = this;

	var currentTime = ( new Date() ).getTime();
	var toTerminate = [];
	for( var system in idleSystems )
	{
		if( this.idleSystems.hasOwnProperty( system ))
		{
			if( ( currentTime - this.idleSystems[ system ].idleSince ) > 600000 )
				toTerminate.push( this.idleSystems[ system ]);
		}
	}
	if( toTerminate.length > 0 )
	{
		async.forEachSeries( toTerminate, 
			function( system, done ) {
				delete self.idleSystems[ system.instance ];
				ec2.terminateInstance( self.config.region, system.instance, done );
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
		if( this.activeSystems.hasOwnProeprty( system ))
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
	/* TODO: Get a list of all the instances we care about.
		Then check the utilization of each in turn, and build a lookup.
		Then go back through the lists, and check the lookup to update utils.
		Remember that on the second pass, any given system may not have an entry
		  in the lookup!
	*/  
}

ProcessingCluster.prototype._createNewSystem = function( callback ) {
	/* TODO: Create a new instance to do our processing.
	    Don't forget to rotate through availability zones!
	    Also, add it to the idle systems list before returning it.
	*/
}

ProcessingCluster.prototype._markSystemInUse = function( remoteSystem ) {
	if( this.idleSystems[ remoteSystem.instance ] )
	{
		delete this.idleSystems[ remoteSystem.instance ];
		this.activeSystems[ remoteSystem.instance ] = {
			system: remoteSystem,
			util: 0,
			useCount: 0
		}
	}
	this.activeSystems[ remoteSystem.instance ].useCount++;

	return remoteSystem;
}

module.exports = exports = ProcessingCluster;