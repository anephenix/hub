if (window) {
	// These bits of code are used to debug
	// what messages are sent to the server
	const HubClient = require('../../lib/client/index');
	window.sarusMessages = [];
	const storeMessage = (message) => {
		window.sarusMessages.push(message.data);
	};

	const hubClient = new HubClient({ url: 'ws://localhost:3001' });
	hubClient.sarus.on('message', storeMessage);

	window.hubClient = hubClient;
}
