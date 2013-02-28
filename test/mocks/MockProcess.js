var commandHandlers = {};
function MockProcess( command, arguments, successCallback, failureCallback ) {
	commandHandlers[ command ]( arguments, successCallback, failureCallback );
}
MockProcess.setCommandHandler = function( command, handler ) {
	commandHandlers[ command ] = handler;
}

module.exports = exports = MockProcess;