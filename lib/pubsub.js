// Dependencies
const { encode } = require('./dataTransformer');
const dataStores = require('./dataStores');

const noClientIdError = 'No client id was found on the WebSocket';
const noChannelError = 'No channel was passed in the data';
const noMessageError = 'No message was passed in the data';
const clientMustBeSubscriberError =
	'You must subscribe to the channel to publish messages to it';
const tooManyWildcardChannelConfigurationsMatchedError =
	'Internal error - too many wildcard channel configurations matched the channel';
const wildcardTooAmbiguousError = (channel) =>
	`Wildcard channel name too ambiguous - will collide with "${channel}"`;
const clientsCannotPublishToChannelError =
	'Clients cannot publish to the channel';

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
		this.channelConfigurations = {};
		const DataStore = dataStores[dataStoreType || 'memory'];
		if (!DataStore)
			throw new Error(
				`dataStoreType "${dataStoreType}" is not a valid option`
			);
		this.dataStore = new DataStore(dataStoreOptions);
		this.publishMessageReceived = this.publishMessageReceived.bind(this);
		this.dataStore.bindOnPublish(this.publishMessageReceived);
		this.attachPubSubFunction = this.attachPubSubFunction.bind(this);
		this.unsubscribeClientFromAllChannels = this.unsubscribeClientFromAllChannels.bind(
			this
		);
		this.attachRPCFunctions();
	}

	attachPubSubFunction(pubSubName) {
		const pubSubFunction = async ({ data, socket, reply }) => {
			try {
				const response = await this[pubSubName]({ data, socket });
				reply({
					type: 'response',
					data: response,
				});
			} catch (error) {
				reply({
					type: 'error',
					error: error.message,
				});
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

	async unsubscribeClientFromAllChannels({ ws }) {
		const { clientId } = ws;
		const channels = await this.dataStore.getChannelsForClientId(clientId);
		if (!channels) return;
		for await (const channel of channels) {
			await this.unsubscribe({ socket: ws, data: { channel } });
		}
	}

	getChannelConfiguration(channel) {
		let channelConfiguration = this.channelConfigurations[channel];
		if (!channelConfiguration) {
			const wildCardChannelConfigurations = Object.keys(
				this.channelConfigurations
			).filter((s) => s.match(/\*/));
			if (
				wildCardChannelConfigurations &&
				wildCardChannelConfigurations.length !== 0
			) {
				if (wildCardChannelConfigurations.length > 1) {
					throw new Error(
						tooManyWildcardChannelConfigurationsMatchedError
					);
				}
				channelConfiguration = this.channelConfigurations[
					wildCardChannelConfigurations[0]
				];
			}
		}
		return channelConfiguration;
	}

	async subscribe({ data, socket }) {
		const { clientId } = socket;
		const { channel } = data;
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		// check if the channel has been specified with options to authenticate
		const channelConfiguration = this.getChannelConfiguration(channel);
		if (channelConfiguration) {
			if (channelConfiguration.authenticate) {
				const authenticated = await channelConfiguration.authenticate({
					socket,
					data,
				});
				if (!authenticated) throw new Error('Not authenticated');
			}
		}
		return await this.addClientToChannel({ clientId, channel });
	}

	async checkClientCanPublish({ channelConfiguration, data, socket }) {
		if (
			channelConfiguration &&
			channelConfiguration.clientCanPublish !== undefined
		) {
			if (
				typeof channelConfiguration.clientCanPublish === 'boolean' &&
				channelConfiguration.clientCanPublish === false
			) {
				throw new Error(clientsCannotPublishToChannelError);
			}
			if (typeof channelConfiguration.clientCanPublish === 'function') {
				const allowed = channelConfiguration.clientCanPublish({
					data,
					socket,
				});
				if (!allowed)
					throw new Error(clientsCannotPublishToChannelError);
			}
		}
	}

	async checkClientIsASubscriberToChannel({ clientId, channel }) {
		const subscribers = await this.dataStore.getClientIdsForChannel(
			channel
		);
		if (!subscribers || subscribers.length === 0) {
			throw new Error(clientMustBeSubscriberError);
		}
		if (subscribers.indexOf(clientId) === -1) {
			throw new Error(clientMustBeSubscriberError);
		}
	}

	async publish({ data, socket }) {
		const clientId = socket && socket.clientId;
		const { channel, message, excludeSender } = data;
		const channelConfiguration = this.getChannelConfiguration(channel);
		if (socket && !clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		if (!message) throw new Error(noMessageError);

		if (clientId) {
			await this.checkClientCanPublish({
				channelConfiguration,
				data,
				socket,
			});
			await this.checkClientIsASubscriberToChannel({ clientId, channel });
		}

		await this.dataStore.putMessageOnQueue({
			channel,
			message,
			clientId,
			excludeSender,
		});

		return {
			success: true,
			message: 'Published message',
		};
	}

	async publishMessageReceived({
		channel,
		message,
		clientId,
		excludeSender,
	}) {
		const subscribers = await this.dataStore.getClientIdsForChannel(
			channel
		);
		const payload = encode({
			action: 'message',
			type: 'event',
			data: { channel, message },
		});

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

	addChannelConfiguration({ channel, authenticate, clientCanPublish }) {
		const wildCardChannelConfigurations = Object.keys(
			this.channelConfigurations
		).filter((s) => s.match(/\*/));
		wildCardChannelConfigurations.forEach((wildcardChannel) => {
			const compare = channel.match(wildcardChannel);
			const reverseCompare = wildcardChannel.match(channel);
			if (compare || reverseCompare) {
				throw new Error(wildcardTooAmbiguousError(wildcardChannel));
			}
		});
		this.channelConfigurations[channel] = {
			authenticate,
			clientCanPublish,
		};
	}

	removeChannelConfiguration(channel) {
		delete this.channelConfigurations[channel];
	}
}

module.exports = PubSub;
