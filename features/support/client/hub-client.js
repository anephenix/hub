// Used as the key for HTML5 Storage
const clientIdKey = 'sarus-client-id';
const storageType = 'localStorage';

// Reply with client id
const replyWithClientId = (sarus) => {
	// eslint-disable-next-line no-undef
	const clientId = window[storageType].getItem(clientIdKey);
	const payload = {
		action: 'reply-client-id',
		data: { clientId },
	};
	sarus.send(JSON.stringify(payload));
};

// Set client Id
const setClientId = (clientId) => {
	// eslint-disable-next-line no-undef
	window[storageType].setItem(clientIdKey, clientId);
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
			console.error(err);
			return err;
		}
	};
};

const enableHubSupport = (sarus) => {
	sarus.on('message', (event) => {
		handleMessage(sarus)(event);
	});
};

module.exports = enableHubSupport;
