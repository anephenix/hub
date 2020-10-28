// Dependencies
const { encode, decode } = require('../dataTransformer');
const bluebird = require('bluebird');
const redisLib = require('redis');
bluebird.promisifyAll(redisLib.RedisClient.prototype);
bluebird.promisifyAll(redisLib.Multi.prototype);

class RedisDataStore {
	constructor({ channelsKey, clientsKey, redisConfig }) {
		this.redis = redisLib.createClient(redisConfig);
		this.internalRedis = redisLib.createClient(redisConfig);
		this.channelsKey = channelsKey || 'hub-channels';
		this.clientsKey = clientsKey || 'hub-clients';
		this.messageQueueChannel = 'hub-message-queue';
		// Subscribe to internal channel
		this.internalRedis.subscribe(this.messageQueueChannel);
	}

	bindOnPublish(func) {
		const { messageQueueChannel } = this;
		this.internalRedis.on('message', async function (channel, message) {
			if (channel === messageQueueChannel) {
				await func(decode(message));
			}
		});
	}

	async putMessageOnQueue(message) {
		await this.redis.publishAsync(
			this.messageQueueChannel,
			encode(message)
		);
	}

	async addItemToCollection({ value, hash, key }) {
		const keyExists = await this.redis.hexistsAsync(hash, key);
		if (!keyExists) {
			await this.redis.hsetAsync(hash, key, encode([value]));
		} else {
			const encodedValues = await this.redis.hgetAsync(hash, key);
			const values = decode(encodedValues);
			if (values.indexOf(value) === -1) {
				values.push(value);
				this.redis.hsetAsync(hash, key, encode(values));
			}
		}
	}

	async removeItemFromCollection({ value, hash, key }) {
		const keyExists = await this.redis.hexistsAsync(hash, key);
		if (keyExists) {
			const encodedValues = await this.redis.hgetAsync(hash, key);
			const values = decode(encodedValues);
			const valueIndex = values.indexOf(value);
			if (valueIndex > -1) {
				values.splice(valueIndex, 1);
				this.redis.hsetAsync(hash, key, encode(values));
			}
		}
	}

	async addClientToChannel({ clientId, channel }) {
		await Promise.all([
			this.addItemToCollection({
				hash: this.channelsKey,
				key: channel,
				value: clientId,
			}),
			this.addItemToCollection({
				hash: this.clientsKey,
				key: clientId,
				value: channel,
			}),
		]);
	}

	async removeClientFromChannel({ clientId, channel }) {
		await Promise.all([
			this.removeItemFromCollection({
				hash: this.channelsKey,
				key: channel,
				value: clientId,
			}),
			this.removeItemFromCollection({
				hash: this.clientsKey,
				key: clientId,
				value: channel,
			}),
		]);
	}

	async getClientIdsForChannel(channel) {
		const encodedValues = await this.redis.hgetAsync(
			this.channelsKey,
			channel
		);
		return decode(encodedValues);
	}

	async getChannelsForClientId(clientId) {
		const encodedValues = await this.redis.hgetAsync(
			this.clientsKey,
			clientId
		);
		return decode(encodedValues);
	}
}

module.exports = RedisDataStore;
