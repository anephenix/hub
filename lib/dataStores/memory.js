class MemoryDataStore {
	constructor() {
		this.clients = {};
		this.channels = {};
		this.banRules = [];
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

	async performActionForClientAndChannel({ action, clientId, channel }) {
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
			clientId,
			channel,
		});
	}

	async removeClientFromChannel({ clientId, channel }) {
		await this.performActionForClientAndChannel({
			action: 'removeItemFromCollection',
			clientId,
			channel,
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

	async getBanRules() {
		return this.banRules;
	}

	async clearBanRules() {
		return (this.banRules = []);
	}

	async hasBanRule({ clientId, host, ipAddress }) {
		const banRules = await this.getBanRules();
		const matchFilter = (b) => {
			return (
				b.clientId === clientId &&
				b.host === host &&
				b.ipAddress === ipAddress
			);
		};
		return banRules.filter(matchFilter).length > 0;
	}

	async addBanRule({ clientId, host, ipAddress }) {
		const existsAlready = await this.hasBanRule({
			clientId,
			host,
			ipAddress,
		});
		if (existsAlready) return;
		this.banRules.push({ clientId, host, ipAddress });
	}

	async removeBanRule({ clientId, host, ipAddress }) {
		const matchFilter = (b) => {
			return (
				b.clientId === clientId &&
				b.host === host &&
				b.ipAddress === ipAddress
			);
		};
		const banRule = this.banRules.find(matchFilter);

		if (!banRule) return null;
		const index = this.banRules.indexOf(banRule);
		this.banRules.splice(index, 1);
		return banRule;
	}
}

module.exports = MemoryDataStore;
