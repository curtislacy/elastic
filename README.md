# "elastic" - elastic architecture on EC2 made automatic and easy!

## How do I use this?
Here's a sample.  Run this code somewhere and you'll contact Amazon, create a HTTP service cluster with load balancer, wire it all up, set up firewalls and start serving requests!  All you need to start are the keys and cert from your EC2 account, a keypair in your account, and an AMI that launches apache on boot.

```js
#!/usr/bin/env node

// Change this based on your particular setup.  This works on OS X.
process.env.JAVA_HOME = '/System/Library/Frameworks/JavaVM.framework/Home/';

// Probably leave these alone.
process.env.EC2_PRIVATE_KEY = __dirname + '/keys/pk-<your file here>.pem';
process.env.EC2_CERT = __dirname + '/keys/cert-<your file here>.pem';

var async = require( 'async' );
var elastic = require( 'elastic' );
var ec2 = elastic.ec2Client;

var cluster = new elastic.LoadBalancedCluster( 
	{
		'region': 'us-east-1',
		'zones': [ 'us-east-1a', 'us-east-1b', 'us-east-1d' ],
		'name': 'test-lb-cluster',
		'ami': 'ami-0d3aba64',	
		'securityGroup': 'test-cluster-group',
		'firewallAllow': [
			{
				'port': 80,
				'subnet': '0.0.0.0/0',
				// 'group': 'sg-4251245',
			},
		],
		'externalPort': 80,
		'internalPort': 80,
		'protocol': 'http',
		'keypair': '<your keypair name>',
		'type': 't1.micro'
	}
);
cluster.start( function( error, clusterDns ) {
	if( error )
		console.log( error );
	else
		console.log( cluster.config.name + ' is running at ' + clusterDns );
});
```

## Logging

By default, elastic spouts progress and status reports to the console, but you can replace the logger with any object that has a '''log( message )``` function.  For example, this will prepend a message "CUSTOM!" to every log entry:

```js
var elastic = require( 'elastic' );
elastic.setLogger( {
	log: function( obj ) {
		console.log( 'CUSTOM!' + obj );
	}
} );
```

# License

Some components of this product are released under specific license terms.  See ```ec2-api-tools-1.6.5.2/THIRDPARTYLICENSE.TXT``` and ```ec2-api-tools-1.6.5.2/license.txt```.

Other portions of this product are released under the MIT License:

The MIT License (MIT)
Copyright © 2012 Engine, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

