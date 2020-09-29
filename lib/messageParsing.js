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
		return processClientId({ data, ws });
	},

	// PubSub - publish
	publish: ({ pubsub, data, ws }) => {
		// Publishes the message for the channel
		return pubsub.publish({ data, ws });
	},

	// PubSub - subscribe
	subscribe: ({ pubsub, data, ws }) => {
		// Add the user to a channel
		return pubsub.subscribe({ data, ws });
	},

	// // PubSub - unsubscribe
	// unsubscribe: ({ data, ws }) => {
	// 	// Remove the user from a channel
	// },

	// // RPC request from client
	// rpc: ({ data, ws }) => {},
};

const parseMessage = (pubsub) => {
	return ({ message, ws }) => {
		try {
			const payload = JSON.parse(message);
			const { action, data } = payload;
			if (action && data && messageActions[action]) {
				const { action, data } = payload;
				return messageActions[action]({ pubsub, data, ws });
			} else {
				return {
					success: false,
					message:
						'No action will be taken as the data structure does not match the expected pattern',
				};
			}
		} catch (err) {
			return {
				success: false,
				message: 'Error parsing message received from client',
				err,
			};
		}
	};
};

module.exports = { parseMessage, messageActions };
