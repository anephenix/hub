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

	attachRPCFunctions() {
		const { attachPubSubFunction } = this;
		['subscribe', 'publish', 'unsubscribe'].forEach(attachPubSubFunction);
	}

	async clientChannelAction({ clientId, channel, method, message }) {
		await this.dataStore[method]({ clientId, channel });
		return {
			success: true,
			message: `Client "${clientId}" ${message} channel "${channel}"`,
		};		
	}

	async addClientToChannel({ clientId, channel }) {
		return await this.clientChannelAction({
			clientId, channel, method: 'addClientToChannel', message: 'subscribed to'
		});
	}

	async removeClientFromChannel({ clientId, channel }) {
		return await this.clientChannelAction({
			clientId, channel, method: 'removeClientFromChannel', message: 'unsubscribed from'
		});
	}

	async unsubscribeClientFromAllChannels({ ws }) {
		const { clientId } = ws;
		const channels = await this.dataStore.getChannelsForClientId(clientId);
		if (!channels) return;
		for await (const channel of channels) {
			await this.unsubscribe({ socket: ws, data: { channel } });
		}
	}

	getWildcardChannelConfiguration(channel) {
		let channelConfiguration;
		const wildCardChannelConfigurations = Object.keys(
			this.channelConfigurations
		).filter((s) => s.match(/\*/) && channel.includes(s.replace('*', '')));
		if (wildCardChannelConfigurations?.length !== 0) {
			if (wildCardChannelConfigurations.length > 1) {
				throw new Error(
					tooManyWildcardChannelConfigurationsMatchedError
				);
			}
			channelConfiguration = this.channelConfigurations[
				wildCardChannelConfigurations[0]
			];
		}
		return channelConfiguration;
	}

	getChannelConfiguration(channel) {
		let channelConfiguration = this.channelConfigurations[channel];
		if (!channelConfiguration) {
			channelConfiguration = this.getWildcardChannelConfiguration(
				channel
			);
		}
		return channelConfiguration;
	}

	async handleChannelConfiguration({ channel, socket, data }) {
		// check if the channel has been specified with options to authenticate
		const channelConfiguration = this.getChannelConfiguration(channel);
		if (channelConfiguration?.authenticate) {
			const authenticated = await channelConfiguration.authenticate({
				socket,
				data,
			});
			if (!authenticated) throw new Error('Not authenticated');
		}
	}

	async subscribe({ data, socket }) {
		const { clientId } = socket;
		const { channel } = data;
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		await this.handleChannelConfiguration({ channel, socket, data });
		return await this.addClientToChannel({ clientId, channel });
	}

	async checkClientCanPublish({ channelConfiguration, data, socket }) {
		if (channelConfiguration?.clientCanPublish === false) {
			throw new Error(clientsCannotPublishToChannelError);
		}
		if (typeof channelConfiguration?.clientCanPublish === 'function') {
			const allowed = channelConfiguration.clientCanPublish({
				data,
				socket,
			});
			if (!allowed) throw new Error(clientsCannotPublishToChannelError);
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
		const clientId = socket?.clientId;
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

		if (subscribers?.length > 0) {
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

	compareWildcardChannelNames({ channel, wildcardChannel }) {
		const formattedChannel = channel.replace('*', '');
		const formattedWildcardChannel = wildcardChannel.replace('*', '');
		const compare = formattedChannel.includes(formattedWildcardChannel);
		const reverseCompare = formattedWildcardChannel.includes(
			formattedChannel
		);
		if (compare || reverseCompare) {
			throw new Error(wildcardTooAmbiguousError(wildcardChannel));
		}
	}

	addChannelConfiguration({ channel, authenticate, clientCanPublish }) {
		const wildCardChannelConfigurations = Object.keys(
			this.channelConfigurations
		).filter((s) => s.match(/\*/));

		wildCardChannelConfigurations.forEach((wildcardChannel) => {
			this.compareWildcardChannelNames({ channel, wildcardChannel });
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
