function InstanceUtil( elastic ) {
	this.elastic = elastic;
	this.ec2 = elastic.getEc2Client();
	this.spawnProcess = elastic.getProcessHandler();
}
InstanceUtil.prototype.setProcessHandler = function( handler ) {
	this.spawnProcess = handler;
}
InstanceUtil.prototype.getProcessHandler = function() {
	return this.spawnProcess;
}
InstanceUtil.prototype.setEc2Client = function( client ) {
	this.ec2 = client;
}
InstanceUtil.prototype.getEc2Client = function() {
	return this.ec2;
}

InstanceUtil.prototype.waitForStartup = function( config, callback ) {
	var self = this;
	var waitFunction = function( error, launched ) {
		if( error )
			callback( error );
		else
		{
			var newInstanceId = launched[0].instance;

			function findActiveInstance() {
				self.ec2.getRunningInstances( config.zone, 
					function( error, runningInstances ) {
						var newInstance = null;
						runningInstances.forEach( function( i ) {
							if( i.instance == newInstanceId )
								newInstance = i;
						} );
						if( newInstance && newInstance.external )
						{
							var newServer = self.elastic.RemoteSystem( {
								'key':config.key,
								'user': config.user,
								'address': newInstance.external
							});

							function checkUptime() {
								newServer.exec( 'uptime', function( error, result ) {
									if( error )
										setTimeout( checkUptime, 10000 );
									else
									{
										if( !result )
										{
											setTimeout( checkUptime, 10000 );
										}
										else
										{
											newInstance.remoteSystem = newServer;
											callback( null, newInstance );
										}
									}
								});
							}
							checkUptime();
						}
						else
							setTimeout( findActiveInstance, 1000 );
					}
				);
			}
			findActiveInstance();
		}
	}
	return waitFunction;
}

module.exports = exports = InstanceUtil;
