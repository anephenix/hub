class MemoryDataStore {
	constructor() {
		this.clients = {};
		this.channels = {};
		this.messageQueue = [];
		this.messageQueue.push = function (item) {
			Array.prototype.push.call(this, item);
			this.onPush(item);
		};
	}

	bindOnPublish(func) {
		this.messageQueue.onPush = func;
	}

	async putMessageOnQueue(message) {
		this.messageQueue.push(message);
	}

	async addItemToCollection({ value, hash, key }) {
		if (!hash[key]) {
			hash[key] = [value];
		} else {
			if (hash[key].indexOf(value) === -1) {
				hash[key].push(value);
			}
		}
	}

	async removeItemFromCollection({ value, hash, key }) {
		if (!hash[key]) return;
		const valueIndex = hash[key].indexOf(value);
		if (valueIndex === -1) return;
		hash[key].splice(valueIndex, 1);
	}

	async performActionForClientAndChannel({action, clientId, channel}) {
		const { channels, clients } = this;
		await Promise.all([
			this[action]({
				hash: channels,
				key: channel,
				value: clientId,
			}),
			this[action]({
				hash: clients,
				key: clientId,
				value: channel,
			}),
		]);
	}

	async addClientToChannel({ clientId, channel }) {
		await this.performActionForClientAndChannel({
			action: 'addItemToCollection',
			clientId, channel
		});
	}

	async removeClientFromChannel({ clientId, channel }) {
		await this.performActionForClientAndChannel({
			action: 'removeItemFromCollection',
			clientId, channel
		});
	}

	async getClientIdsForChannel(channel) {
		const { channels } = this;
		return channels[channel];
	}

	async getChannelsForClientId(clientId) {
		const { clients } = this;
		return clients[clientId];
	}
}

module.exports = MemoryDataStore;
