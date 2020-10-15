// Dependencies
const assert = require('assert');
const dataStores = require('../../../lib/dataStores');
const MemoryDataStore = require('../../../lib/dataStores/memory');
const RedisDataStore = require('../../../lib/dataStores/redis');

describe('dataStores', () => {
	it('should export an object of available data stores', () => {
		assert.deepStrictEqual(dataStores.memory, MemoryDataStore);
		assert.deepStrictEqual(dataStores.redis, RedisDataStore);
	});
});
