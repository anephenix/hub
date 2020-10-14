class MemoryDataStore {
	constructor() {
		this.clients = {};
		this.channels = {};
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
		if (hash[key]) {
			const valueIndex = hash[key].indexOf(value);
			if (valueIndex > -1) {
				hash[key].splice(valueIndex, 1);
			}
		}
	}

	async addClientToChannel({ clientId, channel }) {
		const { channels, clients } = this;
		// NOTE - you can use Promise.all to run these 2 in parallel
		await this.addItemToCollection({ hash: channels, key: channel, value: clientId });
		await this.addItemToCollection({ hash: clients, key: clientId, value: channel });
	}

	async removeClientFromChannel({ clientId, channel }) {
		const { channels, clients } = this;
		// NOTE - you can use Promise.all to run these 2 in parallel
		await this.removeItemFromCollection({ hash: channels, key: channel, value: clientId });
		await this.removeItemFromCollection({ hash: clients, key: clientId, value: channel });
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