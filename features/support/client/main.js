// // This is the client-side code that is loaded for the web site
// // TODO - work out how to load a site with NPM dependencies
const Sarus = require('@anephenix/sarus');
if (global.window) {
	// eslint-disable-next-line no-undef
	window.sarusMessages = [];
	const storeMessage = (message) => {
		// eslint-disable-next-line no-undef
		window.sarusMessages.push(message.data);
	};

	// I want to abstract this into a new component file
	// Client Key
	const clientIdKey = 'sarus-client-id';

	// Reply with client id
	const replyWithClientId = (sarus) => {
		// eslint-disable-next-line no-undef
		const clientId = window.localStorage.getItem(clientIdKey);
		const payload = {
			action: 'reply-client-id',
			data: { clientId },
		};
		sarus.send(JSON.stringify(payload));
	};

	// Set client Id
	const setClientId = (clientId) => {
		// eslint-disable-next-line no-undef
		window.localStorage.setItem(clientIdKey, clientId);
	};

	// Pub/Sub function that handles doing the linking logic
	const handleMessage = (sarus) => {
		return (message) => {
			const parsedMessageData = JSON.parse(message.data);
			try {
				if (parsedMessageData.action) {
					switch (parsedMessageData.action) {
					case 'request-client-id':
						replyWithClientId(sarus);
						break;
					case 'set-client-id':
						setClientId(parsedMessageData.data.clientId);
						break;
					default:
						break;
					}
				}
			} catch (err) {
				// TODO - perform some form of error handling
			}
		};
	};

	const sarus = new Sarus.default({
		// The url that the site is served at is localhost:3000
		// The url that the test WebSocket server runs at is localhost:3001
		url: 'ws://localhost:3001',
		retryConnectionDelay: true,
	});

	sarus.on('message', storeMessage);

	sarus.on('message', (event) => {
		handleMessage(sarus)(event);
	});

	// eslint-disable-next-line no-undef
	window.sarus = sarus;
}
