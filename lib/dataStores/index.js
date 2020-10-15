const MemoryDataStore = require('./memory');
const RedisDataStore = require('./redis');

const dataStores = {
	memory: MemoryDataStore,
	redis: RedisDataStore,
};

module.exports = dataStores;
