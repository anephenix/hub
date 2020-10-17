/*
	RPC (Remote Procedure Call)
	---------------------------

	This is the Remote Procedure Call JavaScript class. It handles sending
	and receiving messages to/from WebSocket clients, and is used by the 
	clientId and PubSub components to handling message parsing and sending.

	Developers can also add their own custom rpc actions using this library,
	so that they can build APIs for things like fetching commodity prices 
	over WebSockets, or implementing chat functionality in their apps.
*/

// Dependencies
const { v4: uuidv4 } = require('uuid');
const { encode, decode } = require('./dataTransformer');

class RPC {
	constructor(args) {
		this.requests = [];
		this.responses = [];
		this.actions = {};
		this.type = args && args.sarus ? 'client' : 'server';
		if (args && args.sarus) this.sarus = args.sarus;
		this.receive = this.receive.bind(this);
		// Automatically enable RPC message parsing on Sarus
		if (args && args.sarus) this.sarus.on('message', this.receive);
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

	handleError({ error, reply }) {
		reply({
			type: 'error',
			error,
		});
	}

	receive(params) {
		const { requests, responses } = this;
		const sarus = this.sarus;
		let message;
		let ws; // could rename this to ws and write socket ||= this.sarus
		if (sarus) {
			message = params.data;
		} else {
			message = params.message;
			ws = params.ws;
		}
		const socket = sarus || ws;
		const acceptedResponseActions = requests.map((r) => r.action);
		try {
			const payload = decode(message);
			// Omit the message from the responses queue if it does not have
			// a registered action
			if (acceptedResponseActions.indexOf(payload.action) !== -1) {
				responses.push(payload);
			}
			const { id, action, type, data, noReply } = payload;
			const reply = (response) => {
				if (noReply) return null;
				const responsePayload = {
					id,
					action,
					type: response.type || 'response',
					data: response.data,
					error: response.error,
				};
				return socket.send(encode(responsePayload));
			};
			if (!requests.find((r) => r.id === id)) {
				const existingFunctions = this.actions[action];
				if (action && type) {
					if (!existingFunctions) {
						return this.handleError({
							id,
							action,
							error: `No ${this.type} action found`,
							reply,
						});
					} else {
						existingFunctions.map((func) => {
							func({ id, action, type, data, socket, reply });
						});
					}
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

	send({ ws, action, data, noReply }) {
		const { responses } = this;
		const id = uuidv4();
		const type = 'request';
		const payload = {
			id,
			action,
			type,
			data,
			noReply,
		};
		if (!noReply) this.requests.push(payload);
		const socket = this.sarus || ws;
		socket.send(encode(payload));
		let interval;
		return new Promise((resolve, reject) => {
			if (noReply) return resolve(null);
			interval = setInterval(() => {
				const response = responses.find(
					(r) => r.id === id && r.action === action
				);
				if (response) {
					clearInterval(interval);
					if (response.type === 'response') {
						resolve(response.data);
					} else if (response.type === 'error') {
						reject(response.error);
					}
					this.cleanupRPCCall(response);
				}
			});
		});
	}
}

module.exports = RPC;
