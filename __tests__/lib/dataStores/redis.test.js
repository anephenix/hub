// Dependencies
const assert = require('assert');
const RedisDataStore = require('../../../lib/dataStores/redis');
const { decode } = require('../../../lib/dataTransformer');
const bluebird = require('bluebird');
const redisLib = require('redis');
bluebird.promisifyAll(redisLib.RedisClient.prototype);
bluebird.promisifyAll(redisLib.Multi.prototype);
const redisConfig = { db: 1 };
let redis;

describe('redis data store', () => {

	const dataStore = new RedisDataStore({ redisConfig });
	const hash = dataStore.channelsKey;
	const key = 'news';
	const value = 'xxx';
	const anotherValue = 'yyy';

	beforeAll(() => {
		redis = redisLib.createClient(redisConfig);
	});

	afterAll(async () => {
		await redis.delAsync(dataStore.channelsKey);
		await redis.delAsync(dataStore.clientsKey);
		await redis.quitAsync();
		await dataStore.internalRedis.quitAsync();
		await dataStore.redis.quitAsync();
	});

	it('should initialise with a redis client', () => {
		assert(dataStore.redis instanceof redisLib.RedisClient);
	});

	describe('#addItemToCollection', () => {
		describe('when the key does not exist on the hash', () => {
			it(
				'should set the hash key to an array containing the passed value', async () => {
					await dataStore.addItemToCollection({
						value,
						hash,
						key,
					});
					const encodedValues = await redis.hgetAsync(hash, key);
					const values = decode(encodedValues);
					assert.deepStrictEqual(values, [value]);
				}
			);
		});

		describe('when the key exists on the hash', () => {
			it(
				'should append the value to the existing values of the hash key', async () => {
					await dataStore.addItemToCollection({
						value: anotherValue,
						hash,
						key,
					});
					const encodedValues = await redis.hgetAsync(hash, key);
					const values = decode(encodedValues);
					assert.deepStrictEqual(values, [value, anotherValue ]);
				}
			);
		});
	});

	describe('#removeItemFromCollection', () => {
		it('should remove the value from the values of the hash key', async () => {
			await dataStore.removeItemFromCollection({
				value,
				hash,
				key,
			});
			const encodedValues = await redis.hgetAsync(hash, key);
			const values = decode(encodedValues);
			assert.deepStrictEqual(values, [anotherValue]);
		});

		it('should do nothing if passed a hash and key that have no existing values', async () => {
			const encodedValues = await redis.hgetAsync(hash, key);
			await dataStore.removeItemFromCollection({
				value,
				hash: 'foo',
				key: 'bar',
			});
			const newEncodedValues = await redis.hgetAsync(hash, key);
			assert.strictEqual(encodedValues, newEncodedValues);
		});

		it('should do nothing if passed a hash and key that have no existing values', async () => {
			const encodedValues = await redis.hgetAsync(hash, key);
			await dataStore.removeItemFromCollection({
				value: 'baz',
				hash,
				key,
			});
			const newEncodedValues = await redis.hgetAsync(hash, key);
			assert.strictEqual(encodedValues, newEncodedValues);
		});


	});

	describe('#addClientToChannel', () => {
		const clientId = 'zzz';
		const channel = 'business';
		beforeAll(async () => {
			await dataStore.addClientToChannel({ clientId, channel });
		});

		it(
			'should add the clientID value to the channel key in the channels hash', async () => {
				const encodedValues = await redis.hgetAsync(dataStore.channelsKey, channel);
				const values = decode(encodedValues);
				assert.deepStrictEqual(values, [clientId]);
			}
		);

		it(
			'should add the channel value to the clientId key in the clients hash', async () => {
				const encodedValues = await redis.hgetAsync(dataStore.clientsKey, clientId);
				const values = decode(encodedValues);
				assert.deepStrictEqual(values, [channel]);
			}
		);
	});

	describe('#removeClientFromChannel', () => {

		const clientId = 'aaa';
		const otherClientId = 'bbb';
		const channel = 'entertainment';
		beforeAll(async () => {
			await dataStore.addClientToChannel({ clientId, channel });
			await dataStore.addClientToChannel({
				clientId: otherClientId,
				channel,
			});
			await dataStore.removeClientFromChannel({ clientId, channel });
		});
	
		it(
			'should remove the clientID value from the channel key in the channels hash', async () => {
				const encodedValues = await redis.hgetAsync(dataStore.channelsKey, channel);
				const values = decode(encodedValues);
				assert.deepStrictEqual(values, [otherClientId]);
			}
		);
		it(
			'should remove the channel value from the clientId key in the clients hash', async () => {
				const encodedValues = await redis.hgetAsync(dataStore.clientsKey, clientId);
				const values = decode(encodedValues);
				assert.deepStrictEqual(values, []);
			}
		);
	});

	describe('#getClientIdsForChannel', () => {
		it(
			'should return the client ids that are subscribed to a channel', async () => {
				const clientIds = await dataStore.getClientIdsForChannel(
					'business'
				);
				assert.deepStrictEqual(clientIds, ['zzz']);
			}
		);
	});

	describe('#getChannelsForClientId', () => {
		it('should return the channels that a clientId has subscribed to', async () => {
			const channels = await dataStore.getChannelsForClientId('zzz');
			assert.deepStrictEqual(channels, ['business']);
		});
	});
});
