class RPC {
	constructor({ wss }) {
		this.wss = wss;
		this.actions = {};
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

	handleError({ id, action, error, ws }) {
		const payload = {
			id,
			action,
			type: 'error',
			data: {
				error,
			},
		};
		ws.send(JSON.stringify(payload));
	}

	call({ message, ws }) {
		try {
			const payload = JSON.parse(message);
			const { id, action, type, data } = payload;
			const existingFunctions = this.actions[action];
			if (action && type) {
				if (!existingFunctions) {
					return this.handleError({
						id,
						action,
						error: 'No action found',
						ws,
					});
				} else {
					existingFunctions.map((func) => {
						func({ id, action, type, data, ws });
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
}

module.exports = RPC;
