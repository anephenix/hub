// Dependencies
const RPC = require('../rpc');

// eslint-disable-next-line no-undef
const isNode = () => {
	try {
		// eslint-disable-next-line no-undef
		window;
		return false;
	} catch (err) {
		return true;
	}
};

if (isNode()) {
	const WebSocket = require('ws');
	global.WebSocket = WebSocket;
	global.localStorage = require('localStorage');
	// LocalStorage API is identical to SessionStorage API, the only
	// difference is that localStorage persists beyond browser sessions and
	// tabs, whereas sessionStorage is unique to a browser tab/session.
	//
	// This should fix a bug that Dashku ran into with server-side rendering
	// in Next.js.
	global.sessionStorage = require('localStorage');
}
const Sarus = require('@anephenix/sarus');
const { delay, delayUntil } = require('../../helpers/delay');

class HubClient {
	constructor({ url, sarusConfig, clientIdKey, storageType }) {
		if (!sarusConfig) sarusConfig = { url };
		if (!sarusConfig.url) sarusConfig.url = url;
		// eslint-disable-next-line no-undef
		this.context = isNode() === true ? global : window;
		this.sarus = new Sarus.default(sarusConfig);
		this.rpc = new RPC({ sarus: this.sarus });
		this.clientIdKey = clientIdKey || 'sarus-client-id';
		this.storageType = storageType || 'localStorage';
		this.enableClientIdentifcation();
		this.setupPubSub();
	}

	setupPubSub() {
		this.subscribe = this.subscribe.bind(this);
		this.unsubscribe = this.unsubscribe.bind(this);
		this.publish = this.publish.bind(this);
		this.resubscribeOnReconnect = this.resubscribeOnReconnect.bind(this);
		this.channelMessageHandlers = {};
		this.channels = [];
		this.channelOptions = {};
		this.sarus.on('open', this.resubscribeOnReconnect);
	}

	async resubscribeOnReconnect() {
		if (this.channels.length === 0) return;
		await delayUntil(async () => this.sarus.ws.readyState === 1);
		await delayUntil(async () => {
			await delay(50);
			const { hasClientId } = await this.rpc.send({
				action: 'has-client-id',
			});
			return hasClientId;
		});
		for await (const channel of this.channels) {
			const opts = this.channelOptions[channel];
			await this.subscribe(channel, opts);
		}
	}

	listChannelMessageHandlers(channel) {
		if (!channel) return this.channelMessageHandlers;
		return this.channelMessageHandlers[channel] || null;
	}

	addChannelMessageHandler(channel, handlerFunc) {
		if (!this.channelMessageHandlers[channel]) {
			this.channelMessageHandlers[channel] = [handlerFunc];
		} else {
			this.channelMessageHandlers[channel].push(handlerFunc);
		}
	}

	removeChannelMessageHandler(channel, handlerFuncOrName) {
		const existingFunc = this.findFunction(channel, handlerFuncOrName);
		if (existingFunc) {
			const index = this.channelMessageHandlers[channel].indexOf(
				existingFunc
			);
			this.channelMessageHandlers[channel].splice(index, 1);
		} else {
			throw new Error(`Function not found for channel "${channel}"`);
		}
	}

	findFunction(channel, handlerFuncOrName) {
		if (typeof handlerFuncOrName === 'string') {
			const byName = (f) => f.name === handlerFuncOrName;
			return this.channelMessageHandlers[channel].find(byName);
		} else {
			if (
				this.channelMessageHandlers[channel].indexOf(
					handlerFuncOrName
				) !== -1
			) {
				return handlerFuncOrName;
			}
		}
	}

	enableClientIdentifcation() {
		const { storageType, clientIdKey, rpc, sarus } = this;
		rpc.add('get-client-id', ({ reply }) => {
			const clientId = this.context[storageType].getItem(clientIdKey);
			reply({ data: { clientId } });
		});

		rpc.add('set-client-id', ({ data, reply }) => {
			this.context[storageType].setItem(clientIdKey, data.clientId);
			reply({
				data: { success: true },
			});
		});

		rpc.add('message', ({ type, action, data }) => {
			if (type === 'event' && action === 'message') {
				const handlers = this.channelMessageHandlers[data.channel];
				if (handlers) {
					handlers.forEach((func) => func(data.message));
				}
			}
		});

		rpc.add('kick', () => {
			sarus.reconnectAutomatically = false;
		});
	}
	addChannel(channel, opts) {
		if (this.channels.indexOf(channel) === -1) {
			this.channels.push(channel);
			this.channelOptions[channel] = opts;
		}
	}

	removeChannel(channel) {
		const channelIndex = this.channels.indexOf(channel);
		if (channelIndex !== -1) {
			this.channels.splice(channelIndex, 1);
			this.channelOptions[channel] = null;
		}
	}

	async subscribe(channel, opts) {
		try {
			const request = {
				action: 'subscribe',
				data: { channel, ...opts },
			};
			const response = await this.rpc.send(request);
			this.addChannel(channel, opts);
			return response;
		} catch (err) {
			return err;
		}
	}

	async unsubscribe(channel) {
		try {
			const request = {
				action: 'unsubscribe',
				data: { channel },
			};
			const response = await this.rpc.send(request);
			this.removeChannel(channel);
			return response;
		} catch (err) {
			return err;
		}
	}

	async publish(channel, message, excludeSender = false) {
		try {
			const request = {
				action: 'publish',
				data: { channel, message, excludeSender },
			};
			return await this.rpc.send(request);
		} catch (err) {
			return err;
		}
	}

	getClientId() {
		const { storageType, clientIdKey } = this;
		const clientId = this.context[storageType].getItem(clientIdKey);
		return clientId || null;
	}

	async isReady() {
		await delayUntil(() => {
			return this.sarus.ws.readyState === 1;
		});
		await delayUntil(() => {
			return this.getClientId();
		});
	}
}
module.exports = HubClient;
