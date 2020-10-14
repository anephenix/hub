// Dependencies
const { encode, decode } = require('../dataTransformer');
const bluebird = require('bluebird');
const redisLib = require('redis');
bluebird.promisifyAll(redisLib.RedisClient.prototype);
bluebird.promisifyAll(redisLib.Multi.prototype);
const redis = redisLib.createClient();

class RedisDataStore {

	constructor() {
		this.channelsKey = 'hub-channels';
		this.clientsKey = 'hub-clients';
	}

	async addItemToCollection({ value, hash, key }) {
		const keyExists = await redis.hexistsAsync(hash, key);
		if (!keyExists) {
			await redis.hsetAsync(hash, key, encode([value]));
		} else {
			const encodedValues = await redis.hgetAsync(hash, key);
			const values = decode(encodedValues);
			if (values.indexOf(value) === -1) {
				values.push(value);
				redis.hsetAsync(hash, key, encode(values));
			}
		}
	}

	async removeItemFromCollection({ value, hash, key }) {
		const keyExists = await redis.hexistsAsync(hash, key);
		if (keyExists) {
			const encodedValues = await redis.hgetAsync(hash, key);
			const values = decode(encodedValues);
			const valueIndex = values.indexOf(value);
			if (valueIndex > -1) {
				values.splice(valueIndex, 1);
				redis.hsetAsync(hash, key, encode(values));
			}
		}
	}

	async addClientToChannel({ clientId, channel }) {
		// NOTE - you can use Promise.all to run these 2 in parallel
		await this.addItemToCollection({ hash: this.channelsKey, key: channel, value: clientId });
		await this.addItemToCollection({ hash: this.clientsKey, key: clientId, value: channel });
	}

	async removeClientFromChannel({ clientId, channel }) {
		// NOTE - you can use Promise.all to run these 2 in parallel
		await this.removeItemFromCollection({ hash: this.channelsKey, key: channel, value: clientId });
		await this.removeItemFromCollection({ hash: this.clientsKey, key: clientId, value: channel });
	}

	async getClientIdsForChannel(channel) {
		const encodedValues = await redis.hgetAsync(this.channelsKey, channel);
		return decode(encodedValues);
	}

	async getChannelsForClientId(clientId) {
		const encodedValues = await redis.hgetAsync(this.clientsKey, clientId);
		return decode(encodedValues);
	}
}

module.exports = RedisDataStore;