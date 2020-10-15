// Dependencies
const assert = require('assert');
const MemoryDataStore = require('../../../lib/dataStores/memory');

describe('memory data store', () => {
	const memoryStore = new MemoryDataStore();
	const hash = memoryStore.channels;
	const key = 'news';
	const value = 'xxx';
	const anotherValue = 'yyy';

	it('should initialise with an empty set of clients and channels', () => {
		assert.deepStrictEqual(memoryStore.channels, {});
		assert.deepStrictEqual(memoryStore.clients, {});
	});

	describe('#addItemToCollection', () => {
		describe('when the key does not exist on the hash', () => {
			it('should set the hash key to an array containing the passed value', async () => {
				await memoryStore.addItemToCollection({
					value,
					hash,
					key,
				});
				assert.deepStrictEqual(memoryStore.channels[key], [value]);
			});
		});

		describe('when the key exists on the hash', () => {
			it('should append the value to the existing values of the hash key', async () => {
				await memoryStore.addItemToCollection({
					value: anotherValue,
					hash,
					key,
				});
				assert.deepStrictEqual(memoryStore.channels[key], [
					value,
					anotherValue,
				]);
			});
		});
	});

	describe('#removeItemFromCollection', () => {
		it('should remove the value from the values of the hash key', async () => {
			await memoryStore.removeItemFromCollection({
				value,
				hash,
				key,
			});
			assert.deepStrictEqual(memoryStore.channels[key], [anotherValue]);
		});

		it('should do nothing if passed a hash and key that have no existing values', async () => {
			const copyofChannels = memoryStore.channels;
			await memoryStore.removeItemFromCollection({
				value,
				hash: 'foo',
				key: 'bar',
			});
			assert.deepStrictEqual(copyofChannels, memoryStore.channels);
		});

		it('should do nothing if passed a hash and key that have no existing values', async () => {
			const copyofChannels = memoryStore.channels;
			await memoryStore.removeItemFromCollection({
				value: 'baz',
				hash,
				key,
			});
			assert.deepStrictEqual(copyofChannels, memoryStore.channels);
		});

	});

	describe('#addClientToChannel', () => {
		const clientId = 'zzz';
		const channel = 'business';
		beforeAll(async () => {
			await memoryStore.addClientToChannel({ clientId, channel });
		});

		it('should add the clientID value to the channel key in the channels hash', () => {
			assert.deepStrictEqual(memoryStore.channels[channel], [clientId]);
		});
		it('should add the channel value to the clientId key in the clients hash', () => {
			assert.deepStrictEqual(memoryStore.clients[clientId], [channel]);
		});
	});

	describe('#removeClientFromChannel', () => {
		const clientId = 'aaa';
		const otherClientId = 'bbb';
		const channel = 'entertainment';
		beforeAll(async () => {
			await memoryStore.addClientToChannel({ clientId, channel });
			await memoryStore.addClientToChannel({
				clientId: otherClientId,
				channel,
			});
			await memoryStore.removeClientFromChannel({ clientId, channel });
		});

		it('should remove the clientID value from the channel key in the channels hash', () => {
			assert.deepStrictEqual(memoryStore.channels[channel], [
				otherClientId,
			]);
		});
		it('should remove the channel value from the clientId key in the clients hash', () => {
			assert.deepStrictEqual(memoryStore.clients[clientId], []);
		});
	});

	describe('#getClientIdsForChannel', () => {
		it('should return the client ids that are subscribed to a channel', async () => {
			const clientIds = await memoryStore.getClientIdsForChannel(
				'business'
			);
			assert.deepStrictEqual(clientIds, ['zzz']);
		});
	});

	describe('#getChannelsForClientId', () => {
		it('should return the channels that a clientId has subscribed to', async () => {
			const channels = await memoryStore.getChannelsForClientId('zzz');
			assert.deepStrictEqual(channels, ['business']);
		});
	});
});
