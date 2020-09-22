// Dependencies
const { processClientId } = require('./clientIdentification');

// This is used to handle JSON payloads that contain action and data keys,
// which indicate passing data to an action defined here
const messageActions = {
	'reply-client-id': ({ data, ws }) => {
		console.log('Received reply');
		processClientId({ data, ws });
	},
};

const parseMessage = ({ message, ws }) => {
	try {
		const payload = JSON.parse(message);
		const keys = Object.keys(payload);
		if (keys.includes('action') && keys.includes('data')) {
			const { action, data } = payload;
			messageActions[action]({ data, ws });
		} else {
			console.log('received JSON: %s', message);
			console.log(
				'No action will be taken as the data structure does not match the expected pattern'
			);
		}
	} catch (err) {
		console.log('Error parsing message received from client');
		console.error(err);
	}
};

module.exports = { parseMessage, messageActions };
