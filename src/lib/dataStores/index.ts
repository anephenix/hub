/*
	This is a set of data stores that can be used by Hub for storing 
	information on:

	- what clients are connected
	- what channels are available
	- what clients are subscribed to which channels
	- what messages have been sent to which channels

	The in-memory data store is the default and is used for testing purposes.
	It is not suitable for production use as it does not persist data across
	restarts, and it does not support clustering.

	Redis is used for production use cases, as it supports clustering and
	persists data across restarts.
*/

// Dependencies
import MemoryDataStore from "./memory";
import RedisDataStore from "./redis";

const dataStores = {
	memory: MemoryDataStore,
	redis: RedisDataStore,
};

export default dataStores;
