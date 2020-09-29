// These are in-memory options, but in a real-world setting this data
// would be stored in a database of some sort.

// NOTE - at some point, channels might need a uuid as key rather than name, because you can't guarantee that channel names are unique.

// const clients = {};
// const channels = {};

// const addClientToChannel = ({ clientId, channel }) => {
// 	// Add the clientId to the channel
// 	if (!channels[channel]) {
// 		channels[channel] = [clientId];
// 	} else {
// 		if (channels[channel].indexOf(clientId) === -1) {
// 			channels[channel].push(clientId);
// 		}
// 	}

// 	// Add the channel to the clientId
// 	if (!clients[clientId]) {
// 		clients[clientId] = [channel];
// 	} else {
// 		if (clients[clientId].indexOf(channel) === -1) {
// 			clients[clientId].push(channel);
// 		}
// 	}

// 	return {
// 		success: true,
// 		message: `Client "${clientId}" subscribed to channel "${channel}"`,
// 	};
// };

const noClientIdError = {
	success: false,
	message: 'No client id was found on the WebSocket',
};

const noChannelError = {
	success: false,
	message: 'No channel was passed in the data',
};

const noMessageError = {
	success: false,
	message: 'No message was passed in the data',
};

class PubSub {
	constructor({ wss }) {
		this.wss = wss;
		this.clients = {};
		this.channels = {};
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
		if (!clientId) return ws.send(JSON.stringify(noClientIdError));
		if (!channel) return ws.send(JSON.stringify(noChannelError));
		return ws.send(
			JSON.stringify(this.addClientToChannel({ clientId, channel }))
		);
	}

	publish({ data, ws }) {
		if (ws) {
			const { clientId } = ws;
			const { channel, message, excludeSender } = data;
			const { channels } = this;
			if (!clientId) return ws.send(JSON.stringify(noClientIdError));
			if (!channel) return ws.send(JSON.stringify(noChannelError));
			if (!message) return ws.send(JSON.stringify(noMessageError));

			const subscribers = channels[channel];
			const payload = JSON.stringify({
				action: 'message',
				data: { channel, message },
			});

			// You have to loop through all of the websocket clients
			// in order to find the ones that are subscribers
			this.wss.clients.forEach((client) => {
				if (subscribers.indexOf[client.clientId] !== -1) {
					if (excludeSender && client.clientId === ws.clientId) {
						// Do nothing
					} else {
						client.send(payload);
					}
				}
			});

			return JSON.stringify({
				success: 'true',
				message: 'Published message',
			});
		} else {
			const { channel, message } = data;
			const { channels } = this;
			if (!channel) return ws.send(JSON.stringify(noChannelError));
			if (!message) return ws.send(JSON.stringify(noMessageError));

			const subscribers = channels[channel];
			const payload = JSON.stringify({
				action: 'message',
				data: { channel, message },
			});

			// You have to loop through all of the websocket clients
			// in order to find the ones that are subscribers
			this.wss.clients.forEach((client) => {
				if (subscribers.indexOf(client.clientId) !== -1) {
					client.send(payload);
				}
			});

			return JSON.stringify({
				success: 'true',
				message: 'Published message',
			});
		}
	}

	unsubscribe({ data, ws }) {
		const { clientId } = ws;
		const { channel } = data;
		if (!clientId) return ws.send(JSON.stringify(noClientIdError));
		if (!channel) return ws.send(JSON.stringify(noChannelError));
		return ws.send(
			JSON.stringify(this.removeClientFromChannel({ clientId, channel }))
		);
	}
}

module.exports = PubSub;
