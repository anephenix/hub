// Dependencies
const { processClientId } = require('./clientIdentification');

const parseMessage = ({ message, ws }) => {
	try {
		const payload = JSON.parse(message);
		if (payload.action) {
			if (payload.action === 'reply-client-id') {
				console.log('Received reply');
				processClientId(payload.data, ws);
			}
		} else {
			console.log('received: %s', message);
		}
	} catch (err) {
		console.log('Error parsing message received from client');
		console.error(err);
	}
};

module.exports = { parseMessage };
