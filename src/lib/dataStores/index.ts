import MemoryDataStore from "./memory";
import RedisDataStore from "./redis";

const dataStores = {
	memory: MemoryDataStore,
	redis: RedisDataStore,
};

export default dataStores;
