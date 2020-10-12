// // This is the client-side code that is loaded for the web site
require('regenerator-runtime/runtime');

if (global.window) {
	// These bits of code are used to debug
	// what messages are sent to the server
	const { HubClient } = require('../../../index');
	// eslint-disable-next-line no-undef
	window.sarusMessages = [];
	const storeMessage = (message) => {
		// eslint-disable-next-line no-undef
		window.sarusMessages.push(message.data);
	};

	const sarusConfig = {
		// The url that the site is served at is localhost:3000
		// The url that the test WebSocket server runs at is localhost:3001
		url: 'ws://localhost:3001',
		retryConnectionDelay: true,
	};
	const hubClient = new HubClient({ sarusConfig });
	hubClient.sarus.on('message', storeMessage);

	// eslint-disable-next-line no-undef
	window.hubClient = hubClient;
}