// These are in-memory options, but in a real-world setting this data
// would be stored in a database of some sort.

// NOTE - at some point, channels might need a uuid as key rather than name, because you can't guarantee that channel names are unique.

const clients = {};
const channels = {};

const addClientToChannel = ({ clientId, channel }) => {
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
};

const subscribe = ({ data, ws }) => {
	const { clientId } = ws;
	if (!clientId)
		return {
			success: false,
			message: 'No client id was found on the WebSocket',
		};
	const { channel } = data;
	if (!channel) {
		return {
			success: false,
			message: 'No channel was passed in the data',
		};
	}
	return addClientToChannel({ clientId, channel });
};

module.exports = {
	subscribe,
	clients,
	channels,
};
