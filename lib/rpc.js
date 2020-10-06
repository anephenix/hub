class RPC {
	constructor({ wss }) {
		this.wss = wss;
		this.actions = {};
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
			if (type == 'request') {
				const existingFunctions = this.actions[action];
				if (!existingFunctions)
					return this.handleError({
						id,
						action,
						error: 'No action found',
						ws,
					});
				existingFunctions.map((func) => {
					func({ id, data, ws });
				});
			} else {
				return this.handleError({
					id,
					action,
					error: 'Unrecognised RPC call type',
					ws,
				});
			}
		} catch (err) {
			console.error(err);
			return err;
		}
	}
}

module.exports = RPC;
