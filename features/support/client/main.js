// // This is the client-side code that is loaded for the web site
const Sarus = require('@anephenix/sarus');
const enableHubSupport = require('./hub-client');

if (global.window) {
	// These bits of code are used to debug
	// what messages are sent to the server
	// eslint-disable-next-line no-undef
	window.sarusMessages = [];
	const storeMessage = (message) => {
		// eslint-disable-next-line no-undef
		window.sarusMessages.push(message.data);
	};

	const sarus = new Sarus.default({
		// The url that the site is served at is localhost:3000
		// The url that the test WebSocket server runs at is localhost:3001
		url: 'ws://localhost:3001',
		retryConnectionDelay: true,
	});

	sarus.on('message', storeMessage);

	enableHubSupport(sarus);

	// eslint-disable-next-line no-undef
	window.sarus = sarus;
}
