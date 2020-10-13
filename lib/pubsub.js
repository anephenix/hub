// Dependencies
const { encode } = require('./dataTransformer');

// These are in-memory options, but in a real-world setting this data
// would be stored in a database of some sort.

// NOTE - at some point, channels might need a uuid as key rather than name, because you can't guarantee that channel names are unique.

const noClientIdError = 'No client id was found on the WebSocket';
const noChannelError = 'No channel was passed in the data';
const noMessageError = 'No message was passed in the data';
const noSubscribersError = 'There are currently no subscribers to that channel';

//
// NOTE - errors are now thrown by the internal functions, and handled by the rpc wrapper functions
//			unit tests will need to be updated to reflect this change in behaviour

class PubSub {
	constructor({ wss, rpc }) {
		this.wss = wss;
		this.clients = {};
		this.channels = {};
		this.rpc = rpc;
		this.attachPubSubFunction = this.attachPubSubFunction.bind(this);
		this.attachRPCFunctions();
	}

	attachPubSubFunction(pubSubName) {
		const pubSubFunction = ({ id, action, type, data, ws }) => {
			if (type === 'request') {
				const reply = {
					id,
					action,
				};
				try {
					const response = this[pubSubName]({ data, ws });
					reply.type = 'response';
					reply.data = response;
				} catch (error) {
					reply.type = 'error';
					reply.error = error.message;
				}
				ws.send(encode(reply));
			}
		};
		this.rpc.add(pubSubName, pubSubFunction);
	}

	// Attach subscribe, publish, and unsubscribe actions here
	attachRPCFunctions() {
		const { attachPubSubFunction } = this;
		['subscribe', 'publish', 'unsubscribe'].forEach(attachPubSubFunction);
	}

	addClientToChannel({ clientId, channel }) {
		const { channels, clients } = this;
		// Add the clientId to the channel
		if (!channels[channel]) {
			channels[channel] = [clientId];
		} else {
			if (channels[channel].indexOf(clientId) === -1) {
				channels[channel].push(clientId);
			}
		}

		// Add the channel to the clientId
		if (!clients[clientId]) {
			clients[clientId] = [channel];
		} else {
			if (clients[clientId].indexOf(channel) === -1) {
				clients[clientId].push(channel);
			}
		}

		return {
			success: true,
			message: `Client "${clientId}" subscribed to channel "${channel}"`,
		};
	}

	removeClientFromChannel({ clientId, channel }) {
		const { channels, clients } = this;
		// Remove the clientId from the channel
		if (channels[channel]) {
			const clientIndex = channels[channel].indexOf(clientId);
			if (clientIndex > -1) {
				channels[channel].splice(clientIndex, 1);
			}
		}

		// Remove the channel from the clientId
		if (clients[clientId]) {
			const channelIndex = clients[clientId].indexOf(channel);
			if (channelIndex > -1) {
				clients[clientId].splice(channelIndex, 1);
			}
		}

		return {
			success: true,
			message: `Client "${clientId}" unsubscribed from channel "${channel}"`,
		};
	}

	subscribe({ data, ws }) {
		const { clientId } = ws;
		const { channel } = data;
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		const response = this.addClientToChannel({ clientId, channel });
		return response;
	}

	publish({ data, ws }) {
		const clientId = ws && ws.clientId;
		const { channel, message, excludeSender } = data;
		const { channels } = this;
		if (ws && !clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		if (!message) throw new Error(noMessageError);

		const subscribers = channels[channel];
		const payload = encode({
			action: 'message',
			type: 'event',
			data: { channel, message },
		});

		// QUESTION - should a non-subscriber be able to publish to a channel? - I assume that they shouldn't
		// but then it has to be the case that non-ws publish does not do this check
		if (
			subscribers === undefined ||
			!subscribers ||
			subscribers.length === 0
		) {
			throw new Error(noSubscribersError);
		}

		// You have to loop through all of the websocket clients
		// in order to find the ones that are subscribers
		this.wss.clients.forEach((client) => {
			if (subscribers.indexOf(client.clientId) !== -1) {
				if (ws) {
					const doNotSend =
						excludeSender && client.clientId === ws.clientId;
					if (!doNotSend) {
						client.send(payload);
					}
				} else {
					client.send(payload);
				}
			}
		});

		return {
			success: true,
			message: 'Published message',
		};
	}

	unsubscribe({ data, ws }) {
		const { clientId } = ws;
		const { channel } = data;
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		const response = this.removeClientFromChannel({ clientId, channel });
		return response;
	}
}

module.exports = PubSub;
