// Dependencies
const repl = require('repl');

// Shims to make this work on Node.js rather than the web browser
// It would be great to have this automatically loaded into HubClient and auto-deect

// Other dependencies
const HubClient = require('../../lib/client');
const { enableMessageLogger } = require('./messageLogger');

// Starts the repl
const replInstance = repl.start('> ');
const hubClient = new HubClient({ url: 'ws://localhost:5050' });

// // This enables message logging
enableMessageLogger(hubClient.sarus);

// Tests an RPC call
const makeRequest = async () => {
	try {
		const request = {
			action: 'get-prices',
			data: { stock: 'amzn' },
		};
		const { stock } = await hubClient.rpc.send(request);
		console.log({ stock });
	} catch (err) {
		console.error(err);
	}
};

// Allows us to inspect some variables and call functions via the REPL
replInstance.context.makeRequest = makeRequest;
replInstance.context.sarus = hubClient.sarus;
replInstance.context.subscribe = hubClient.subscribe;
replInstance.context.unsubscribe = hubClient.unsubscribe;
replInstance.context.publish = hubClient.publish;
replInstance.context.exit = process.exit;
