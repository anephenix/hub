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
}
const Sarus = require('@anephenix/sarus');

class HubClient {
	constructor({ sarusConfig }) {
		// eslint-disable-next-line no-undef
		this.context = isNode() === true ? global : window;
		this.sarus = new Sarus.default(sarusConfig);
		this.rpc = new RPC({ sarus: this.sarus });
		this.clientIdKey = 'sarus-client-id';
		this.storageType = 'localStorage';
		this.enableClientIdentifcation();
		this.subscribe = this.subscribe.bind(this);
		this.unsubscribe = this.unsubscribe.bind(this);
		this.publish = this.publish.bind(this);
		this.channelMessageHandlers = {};
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
		// NOTE - detect whether running in browser or node, and switch global to window for browser
		const { storageType, clientIdKey, rpc } = this;
		rpc.add('get-client-id', ({ id, type, action, reply }) => {
			if (type === 'request') {
				const clientId = this.context[storageType].getItem(clientIdKey);
				const payload = {
					id,
					action,
					type: 'response',
					data: { clientId },
				};
				reply(payload);
			}
		});

		rpc.add('set-client-id', ({ id, type, action, data, reply }) => {
			if (type === 'request') {
				this.context[storageType].setItem(clientIdKey, data.clientId);
				const payload = {
					id,
					action,
					type: 'response',
					data: { success: true },
				};
				reply(payload);
			}
		});

		rpc.add('message', ({ type, action, data }) => {
			if (type === 'event' && action === 'message') {
				const handlers = this.channelMessageHandlers[data.channel];
				if (handlers) {
					handlers.forEach((func) => func(data.message));
				}
			}
		});
	}

	async subscribe(channel) {
		try {
			const request = {
				action: 'subscribe',
				data: { channel },
			};
			return await this.rpc.send(request);
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
			return await this.rpc.send(request);
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
}
module.exports = HubClient;
