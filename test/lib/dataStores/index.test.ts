import assert from "node:assert";
import dataStores from "../../../src/lib/dataStores";
import MemoryDataStore from "../../../src/lib/dataStores/memory";
import RedisDataStore from "../../../src/lib/dataStores/redis";
import { describe, it } from "vitest";

describe("dataStores", () => {
	it("should export an object of available data stores", () => {
		assert.deepStrictEqual(dataStores.memory, MemoryDataStore);
		assert.deepStrictEqual(dataStores.redis, RedisDataStore);
	});
});
