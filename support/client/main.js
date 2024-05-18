// // This is the client-side code that is loaded for the web site
// require('regenerator-runtime/runtime');

// eslint-disable-next-line no-undef
if (window) {
	// These bits of code are used to debug
	// what messages are sent to the server
	const HubClient = require('../../lib/client/index');
	// eslint-disable-next-line no-undef
	window.sarusMessages = [];
	const storeMessage = (message) => {
		// eslint-disable-next-line no-undef
		window.sarusMessages.push(message.data);
	};

	const hubClient = new HubClient({ url: 'ws://localhost:3001' });
	hubClient.sarus.on('message', storeMessage);

	// eslint-disable-next-line no-undef
	window.hubClient = hubClient;
}
