// Used as the key for HTML5 Storage
const clientIdKey = 'sarus-client-id';
const storageType = 'localStorage';
const { v4: uuidv4 } = require('uuid');

global.localStorage = require('localStorage');

// Reply with client id
const replyWithClientId = (sarus) => {
	// eslint-disable-next-line no-undef
	const clientId = global[storageType].getItem(clientIdKey);
	const payload = {
		action: 'reply-client-id',
		data: { clientId },
	};
	sarus.send(JSON.stringify(payload));
};

// Set client Id
const setClientId = (clientId) => {
	// eslint-disable-next-line no-undef
	global[storageType].setItem(clientIdKey, clientId);
};

// Pub/Sub function that handles doing the linking logic
const handleMessage = (sarus) => {
	return (message) => {
		const parsedMessageData = JSON.parse(message.data);
		try {
			if (parsedMessageData.action) {
				switch (parsedMessageData.action) {
				case 'request-client-id':
					replyWithClientId(sarus);
					break;
				case 'set-client-id':
					setClientId(parsedMessageData.data.clientId);
					break;
				default:
					break;
				}
			}
		} catch (err) {
			console.error(err);
			return err;
		}
	};
};

const enableHubSupport = (sarus) => {
	sarus.on('message', (event) => {
		handleMessage(sarus)(event);
	});
};

class RPC {
	constructor({ sarus }) {
		this.actions = {};
		this.sarus = sarus;
		this.call = this.call.bind(this);
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
			data: {
				error,
			},
		};
		this.sarus.send(JSON.stringify(payload));
	}

	// This needs to be different in terms of params
	call(message) {
		const { sarus } = this;
		try {
			const payload = JSON.parse(message.data);
			const { id, action, type, data } = payload;
			const existingFunctions = this.actions[action];
			if (action && type) {
				if (!existingFunctions) {
					return this.handleError({
						id,
						action,
						error: 'No action found',
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
		} catch (err) {
			console.error(err);
			return err;
		}
	}

	send({ action, data }) {
		const id = uuidv4();
		const type = 'request';
		const payload = {
			id,
			action,
			type,
			data,
		};
		this.sarus.send(JSON.stringify(payload));
	}
}

module.exports = { enableHubSupport, RPC };
