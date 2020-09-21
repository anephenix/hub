// const { parseMessage } = require('../../lib/messageParsing');

// const parseMessage = ({ message, ws }) => {
// 	try {
// 		const payload = JSON.parse(message);
// 		if (payload.action) {
// 			if (payload.action === 'reply-client-id') {
// 				console.log('Received reply');
// 				processClientId(payload.data, ws);
// 			}
// 		} else {
// 			console.log('received: %s', message);
// 		}
// 	} catch (err) {
// 		console.log('Error parsing message received from client');
// 		console.error(err);
// 	}
// };

describe('messageParsing', () => {
	describe('#parseMessage', () => {
		describe('when it does not receive a valid JSON payload', () => {
			it.todo('should return an error');
		});
		describe('when it receives a valid JSON payload', () => {
			it.todo(
				'should parse the payload, and action it if the payload is a reply for a client id request'
			);
		});
	});
});
