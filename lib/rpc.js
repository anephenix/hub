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
	constructor() {
		this.requests = [];
		this.responses = [];
		this.actions = {};
		this.receive = this.receive.bind(this);
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

	handleError({ id, action, error, ws }) {
		const payload = {
			id,
			action,
			type: 'error',
			data: {
				error,
			},
		};
		ws.send(encode(payload));
	}

	receive({ message, ws }) {
		try {
			const { requests, responses } = this;
			const payload = decode(message);
			const { id, action, type, data } = payload;
			const acceptedResponseActions = requests.map((r) => r.action);
			if (acceptedResponseActions.indexOf(payload.action) !== -1) {
				responses.push(payload);
			}
			if (!requests.find((r) => r.id === id)) {
				const existingFunctions = this.actions[action];
				if (action && type) {
					if (!existingFunctions) {
						return this.handleError({
							id,
							action,
							error: 'No server action found',
							ws,
						});
					} else {
						existingFunctions.map((func) => {
							func({ id, action, type, data, ws });
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

	send({ ws, action, data }) {
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
		ws.send(encode(payload));
		let interval;
		return new Promise((resolve, reject) => {
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
