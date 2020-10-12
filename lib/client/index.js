// Dependencies
const { v4: uuidv4 } = require('uuid');
const { encode, decode } = require('../dataTransformer');

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

class RPC {
	constructor({ sarus }) {
		this.requests = [];
		this.responses = [];
		this.actions = {};
		this.sarus = sarus;
		this.receive = this.receive.bind(this);
		// Automatically enable RPC message parsing on Sarus
		this.sarus.on('message', this.receive);
	}

	add(action, func) {
		const existingFunctions = this.actions[action];
		if (!existingFunctions) {
			this.actions[action] = [func];
		} else {
			this.actions[action].push(func);
		}
	}

	list(action) {
		if (!action) return this.actions;
		return this.actions[action];
	}

	remove(action, func) {
		const index = this.actions[action].indexOf(func);
		if (index !== -1) {
			this.actions[action].splice(index, 1);
		}
	}

	handleError({ id, action, error }) {
		const payload = {
			id,
			action,
			type: 'error',
			error,
		};
		this.sarus.send(encode(payload));
	}

	receive(message) {
		const { sarus, requests, responses } = this;
		const acceptedResponseActions = requests.map((r) => r.action);
		try {
			const payload = decode(message.data);
			// Omit the message from the responses queue if it does not have
			// a registered action
			if (acceptedResponseActions.indexOf(payload.action) !== -1) {
				responses.push(payload);
			}
			const { id, action, type, data } = payload;
			if (!requests.find((r) => r.id === id)) {
				const existingFunctions = this.actions[action];
				if (action && type) {
					if (!existingFunctions) {
						return this.handleError({
							id,
							action,
							error: 'No client action found',
						});
					} else {
						existingFunctions.map((func) => {
							func({ id, action, type, data, sarus });
						});
					}
				} else {
					/* Do nothing, as it does not contain those 2 parameters */
					/* It is possible in this case that the JSON payload is meant for another function */
					/* Or perhaps, move the RPC-message-detection into a higher order function that acts at the first message wrapper */
				}
			}
		} catch (err) {
			console.error(err);
			return err;
		}
	}

	removeItemFromQueue(item, queue) {
		const itemIndex = queue.indexOf(item);
		if (itemIndex !== -1) {
			queue.splice(itemIndex, 1);
		}
	}

	cleanupRPCCall(response) {
		const { requests, responses } = this;
		const request = requests.find((r) => r.id === response.id);
		this.removeItemFromQueue(response, responses);
		this.removeItemFromQueue(request, requests);
	}

	send({ action, data }) {
		const { responses } = this;
		const id = uuidv4();
		const type = 'request';
		const payload = {
			id,
			action,
			type,
			data,
		};
		this.requests.push(payload);
		this.sarus.send(encode(payload));
		let interval;
		return new Promise((resolve, reject) => {
			interval = setInterval(() => {
				const response = responses.find(
					(r) => r.id === id && r.action === action
				);
				if (response) {
					clearInterval(interval);
					if (response.type === 'response') {
						// NOTE - might need to send the whole message
						resolve(response.data);
					} else if (response.type === 'error') {
						// NOTE - might need to send the whole message
						reject(response.error);
					}
					this.cleanupRPCCall(response);
				}
			});
		});
	}
}

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
	}

	enableClientIdentifcation() {
		// NOTE - detect whether running in browser or node, and switch global to window for browser
		const { storageType, clientIdKey, rpc } = this;
		rpc.add('get-client-id', ({ id, type, action, sarus }) => {
			if (type === 'request') {
				const clientId = this.context[storageType].getItem(clientIdKey);
				const payload = {
					id,
					action,
					type: 'response',
					data: { clientId },
				};
				sarus.send(encode(payload));
			}
		});

		rpc.add('set-client-id', ({ id, type, action, data, sarus }) => {
			if (type === 'request') {
				this.context[storageType].setItem(clientIdKey, data.clientId);
				const payload = {
					id,
					action,
					type: 'response',
					data: { success: true },
				};
				sarus.send(encode(payload));
			}
		});
	}

	async subscribe(channel) {
		try {
			const request = {
				action: 'subscribe',
				data: { channel },
			};
			const response = await this.rpc.send(request);
			return response;
			// console.log({ response });
		} catch (err) {
			return err;
			// console.error(err);
		}
	}

	async unsubscribe(channel) {
		try {
			const request = {
				action: 'unsubscribe',
				data: { channel },
			};
			const response = await this.rpc.send(request);
			return response;
			// console.log({ response });
		} catch (err) {
			return err;
			// console.error(err);
		}
	}

	async publish(channel, message, excludeSender = false) {
		try {
			const request = {
				action: 'publish',
				data: { channel, message, excludeSender },
			};
			const response = await this.rpc.send(request);
			return response;
			// console.log({ response });
		} catch (err) {
			return err;
			// console.error(err);
		}
	}
}
module.exports = HubClient;
