// Dependencies
const { encode } = require('./dataTransformer');
const dataStores = require('./dataStores');

// NOTE - at some point, channels might need a uuid as key rather than name, because you can't guarantee that channel names are unique.
const noClientIdError = 'No client id was found on the WebSocket';
const noChannelError = 'No channel was passed in the data';
const noMessageError = 'No message was passed in the data';

// Used to implement the subscribersOnly filter function
Set.prototype.filter = function filter(f) {
	var newSet = new Set();
	for (var v of this) if (f(v)) newSet.add(v);
	return newSet;
};

class PubSub {
	constructor({ wss, rpc, dataStoreType, dataStoreOptions }) {
		this.wss = wss;
		this.rpc = rpc;
		const DataStore = dataStores[dataStoreType || 'memory'];
		if (!DataStore) throw new Error(`dataStoreType "${dataStoreType}" is not a valid option`);
		this.dataStore = new DataStore(dataStoreOptions);
		this.publishMessageReceived = this.publishMessageReceived.bind(this);
		this.dataStore.bindOnPublish(this.publishMessageReceived);
		this.attachPubSubFunction = this.attachPubSubFunction.bind(this);
		this.attachRPCFunctions();
	}

	attachPubSubFunction(pubSubName) {
		const pubSubFunction = async ({
			id,
			action,
			type,
			data,
			socket,
			reply,
		}) => {
			if (type === 'request') {
				const payload = {
					id,
					action,
				};
				try {
					const response = await this[pubSubName]({ data, socket });
					payload.type = 'response';
					payload.data = response;
				} catch (error) {
					payload.type = 'error';
					payload.error = error.message;
				}
				reply(payload);
			}
		};
		this.rpc.add(pubSubName, pubSubFunction);
	}

	// Attach subscribe, publish, and unsubscribe actions here
	attachRPCFunctions() {
		const { attachPubSubFunction } = this;
		['subscribe', 'publish', 'unsubscribe'].forEach(attachPubSubFunction);
	}

	async addClientToChannel({ clientId, channel }) {
		await this.dataStore.addClientToChannel({ clientId, channel });
		return {
			success: true,
			message: `Client "${clientId}" subscribed to channel "${channel}"`,
		};
	}

	async removeClientFromChannel({ clientId, channel }) {
		await this.dataStore.removeClientFromChannel({ clientId, channel });
		return {
			success: true,
			message: `Client "${clientId}" unsubscribed from channel "${channel}"`,
		};
	}

	async subscribe({ data, socket }) {
		const { clientId } = socket;
		const { channel } = data;
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		return await this.addClientToChannel({ clientId, channel });
	}

	async publish({ data, socket }) {
		const clientId = socket && socket.clientId;
		const { channel, message, excludeSender } = data;
		if (socket && !clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		if (!message) throw new Error(noMessageError);

		// It might be at this point that the message is put on a queue in the dataStore
		//
		await this.dataStore.putMessageOnQueue({
			channel, message, clientId, excludeSender
		});

		return {
			success: true,
			message: 'Published message',
		};

		// const subscribers = await this.dataStore.getClientIdsForChannel(
		// 	channel
		// );
		// const payload = encode({
		// 	action: 'message',
		// 	type: 'event',
		// 	data: { channel, message },
		// });

		// // push onto an internal queue here
		// // and have everything else below be an action that reads from that queue
		// // socket needs to be turned into an object with a clientId key
		// //
		// // QUESTION - should a non-subscriber be able to publish to a channel? - I assume that they shouldn't
		// // but then it has to be the case that non-ws publish does not do this check
		// //
		// // NOTE - I would change this so that rather than throw an error, it notes that there are currently
		// // no subscribers to that channel, but worth noting that an error wouldn't be raised
		// //
		// // is it an error to publish a message to 0 subscribers?
		// //

		// if (!subscribers || subscribers.length === 0) {
		// 	throw new Error(noSubscribersError);
		// } else {
		// 	const subscribersOnly = (client) => {
		// 		return subscribers.indexOf(client.clientId) !== -1;
		// 	};

		// 	this.wss.clients.filter(subscribersOnly).forEach((client) => {
		// 		if (!socket) return client.send(payload);
		// 		if (!excludeSender) return client.send(payload);
		// 		if (client.clientId !== socket.clientId) {
		// 			client.send(payload);
		// 		}
		// 	});
		// }
		// return {
		// 	success: true,
		// 	message: 'Published message',
		// };
	}

	async publishMessageReceived({ channel, message, clientId, excludeSender }) {
		const subscribers = await this.dataStore.getClientIdsForChannel(
			channel
		);
		const payload = encode({
			action: 'message',
			type: 'event',
			data: { channel, message },
		});

		// QUESTION - should a non-subscriber be able to publish to a channel? - I assume that they shouldn't
		// but then it has to be the case that non-ws publish does not do this check
		//
		if (subscribers && subscribers.length > 0) {
			const subscribersOnly = (client) => {
				return subscribers.indexOf(client.clientId) !== -1;
			};

			this.wss.clients.filter(subscribersOnly).forEach((client) => {
				if (!clientId) return client.send(payload);
				if (!excludeSender) return client.send(payload);
				if (client.clientId !== clientId) {
					client.send(payload);
				}
			});
		}
	}

	async unsubscribe({ data, socket }) {
		const { clientId } = socket;
		const { channel } = data;
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		return await this.removeClientFromChannel({
			clientId,
			channel,
		});
	}
}

module.exports = PubSub;
