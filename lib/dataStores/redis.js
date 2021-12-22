// Dependencies
const { encode, decode } = require('../dataTransformer');
const redisLib = require('redis');

class RedisDataStore {
	constructor({ channelsKey, clientsKey, banRulesKey, redisConfig }) {
		this.redis = redisLib.createClient(redisConfig);
		this.internalRedis = redisLib.createClient(redisConfig);
		this.channelsKey = channelsKey || 'hub-channels';
		this.clientsKey = clientsKey || 'hub-clients';
		this.banRulesKey = banRulesKey || 'hub-ban-rules';
		this.messageQueueChannel = 'hub-message-queue';
		this.connectAndSubscribe();
	}

	async connectAndSubscribe() {
		const { messageQueueChannel } = this;
		const self = this;
		await this.redis.connect();
		await this.internalRedis.connect();
		// Subscribe to internal channel
		await this.internalRedis.subscribe(
			this.messageQueueChannel,
			async (message, channel) => {
				if (channel === messageQueueChannel) {
					await self.onMessage(decode(message));
				}
			}
		);
	}

	bindOnPublish(func) {
		this.onMessage = func;
	}

	async putMessageOnQueue(message) {
		await this.redis.publish(this.messageQueueChannel, encode(message));
	}

	async addItemToCollection({ value, hash, key }) {
		const keyExists = await this.redis.hExists(hash, key);
		if (!keyExists) {
			await this.redis.hSet(hash, key, encode([value]));
		} else {
			const encodedValues = await this.redis.hGet(hash, key);
			const values = decode(encodedValues);
			if (values.indexOf(value) === -1) {
				values.push(value);
				this.redis.hSet(hash, key, encode(values));
			}
		}
	}

	async removeItemFromCollection({ value, hash, key }) {
		const keyExists = await this.redis.hExists(hash, key);
		if (keyExists) {
			const encodedValues = await this.redis.hGet(hash, key);
			const values = decode(encodedValues);
			const valueIndex = values.indexOf(value);
			if (valueIndex > -1) {
				values.splice(valueIndex, 1);
				this.redis.hSet(hash, key, encode(values));
			}
		}
	}

	async performActionForClientAndChannel({ action, clientId, channel }) {
		await Promise.all([
			this[action]({
				hash: this.channelsKey,
				key: channel,
				value: clientId,
			}),
			this[action]({
				hash: this.clientsKey,
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
		const encodedValues = await this.redis.hGet(this.channelsKey, channel);
		return decode(encodedValues);
	}

	async getChannelsForClientId(clientId) {
		const encodedValues = await this.redis.hGet(this.clientsKey, clientId);
		return decode(encodedValues);
	}

	async getBanRules() {
		const list = await this.redis.lRange(this.banRulesKey, 0, -1);
		return list.map((l) => decode(l));
	}

	async clearBanRules() {
		return await this.redis.del(this.banRulesKey);
	}

	async hasBanRule(item) {
		const banRules = await this.getBanRules();
		const matchFilter = (b) => {
			const keys = Object.keys(b).filter((x) => b[x]);
			const matches = keys.map((k) => b[k] === item[k]);
			return matches.every((x) => x === true);
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
		const encodedRule = encode({ clientId, host, ipAddress });
		return await this.redis.lPush(this.banRulesKey, encodedRule);
	}

	async removeBanRule({ clientId, host, ipAddress }) {
		const matchFilter = (b) => {
			return (
				b.clientId === clientId &&
				b.host === host &&
				b.ipAddress === ipAddress
			);
		};
		const banRules = await this.getBanRules();
		const banRule = banRules.find(matchFilter);

		if (!banRule) return null;
		await this.redis.lRem(this.banRulesKey, 0, encode(banRule));
		return banRule;
	}
}

module.exports = RedisDataStore;
