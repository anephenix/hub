// Dependencies
const { processClientId } = require('./clientIdentification');

/*
	NOTE

	it feels like message actions are initialised by hub, can be added/removed when needed, 
	and if necessary, completely overridden for complete customisation
	
*/

// This is used to handle JSON payloads that contain action and data keys,
// which indicate passing data to an action defined here
const messageActions = {
	// Client identification - required for PubSub
	'reply-client-id': ({ data, ws }) => {
		processClientId({ data, ws });
	},

	// // PubSub - publish
	// publish: ({ data, ws }) => {},

	// // PubSub - subscribe
	// subscribe: ({ data, ws }) => {
	// 	// Add the user to a channel
	// },

	// // PubSub - unsubscribe
	// unsubscribe: ({ data, ws }) => {
	// 	// Remove the user from a channel
	// },

	// // RPC request from client
	// rpc: ({ data, ws }) => {},
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
