// Dependencies
import assert from "node:assert";
import type { RedisClientType } from "redis";
import * as redisLib from "redis";
import { afterAll, beforeAll, describe, it } from "vitest";
import RedisDataStore from "../../../src/lib/dataStores/redis";
import { decode } from "../../../src/lib/dataTransformer";

const redisConfig = { url: "redis://localhost:6379/1" };
let redis: RedisClientType;

describe("redis data store", () => {
	const dataStore = new RedisDataStore({ redisConfig });
	const hash = dataStore.channelsKey;
	const key = "news";
	const value = "xxx";
	const anotherValue = "yyy";

	beforeAll(async () => {
		redis = redisLib.createClient(redisConfig);
		await redis.connect();
	});

	afterAll(async () => {
		await redis.del(dataStore.channelsKey);
		await redis.del(dataStore.clientsKey);
		await redis.quit();
		await dataStore.internalRedis.quit();
		await dataStore.redis.quit();
	});

	it("should initialise with a redis client", () => {
		assert(dataStore.redis);
	});

	describe("#addItemToCollection", () => {
		describe("when the key does not exist on the hash", () => {
			it("should set the hash key to an array containing the passed value", async () => {
				await dataStore.addItemToCollection({
					value,
					hash,
					key,
				});
				const encodedValues = await redis.hGet(hash, key);
				if (!encodedValues) {
					throw new Error(`No values found for hash: ${hash}, key: ${key}`);
				}
				const values = decode(encodedValues);
				assert.deepStrictEqual(values, [value]);
			});
		});

		describe("when the key exists on the hash", () => {
			it("should append the value to the existing values of the hash key", async () => {
				await dataStore.addItemToCollection({
					value: anotherValue,
					hash,
					key,
				});
				const encodedValues = await redis.hGet(hash, key);
				if (!encodedValues) {
					throw new Error(`No values found for hash: ${hash}, key: ${key}`);
				}
				const values = decode(encodedValues);
				assert.deepStrictEqual(values, [value, anotherValue]);
			});
		});
	});

	describe("#removeItemFromCollection", () => {
		it("should remove the value from the values of the hash key", async () => {
			await dataStore.removeItemFromCollection({
				value,
				hash,
				key,
			});
			const encodedValues = await redis.hGet(hash, key);
			if (!encodedValues) {
				throw new Error(`No values found for hash: ${hash}, key: ${key}`);
			}
			const values = decode(encodedValues);
			assert.deepStrictEqual(values, [anotherValue]);
		});

		it("should do nothing if passed a hash and key that have no existing values", async () => {
			const encodedValues = await redis.hGet(hash, key);
			await dataStore.removeItemFromCollection({
				value,
				hash: "foo",
				key: "bar",
			});
			const newEncodedValues = await redis.hGet(hash, key);
			assert.strictEqual(encodedValues, newEncodedValues);
		});

		it("should do nothing if passed a hash and key that have no existing values", async () => {
			const encodedValues = await redis.hGet(hash, key);
			await dataStore.removeItemFromCollection({
				value: "baz",
				hash,
				key,
			});
			const newEncodedValues = await redis.hGet(hash, key);
			assert.strictEqual(encodedValues, newEncodedValues);
		});
	});

	describe("#addClientToChannel", () => {
		const clientId = "zzz";
		const channel = "business";
		beforeAll(async () => {
			await dataStore.addClientToChannel({ clientId, channel });
		});

		it("should add the clientID value to the channel key in the channels hash", async () => {
			const encodedValues = await redis.hGet(dataStore.channelsKey, channel);
			if (!encodedValues) {
				throw new Error(`No values found for hash: ${hash}, key: ${key}`);
			}
			const values = decode(encodedValues);
			assert.deepStrictEqual(values, [clientId]);
		});

		it("should add the channel value to the clientId key in the clients hash", async () => {
			const encodedValues = await redis.hGet(dataStore.clientsKey, clientId);
			if (!encodedValues) {
				throw new Error(`No values found for hash: ${hash}, key: ${key}`);
			}
			const values = decode(encodedValues);
			assert.deepStrictEqual(values, [channel]);
		});
	});

	describe("#removeClientFromChannel", () => {
		const clientId = "aaa";
		const otherClientId = "bbb";
		const channel = "entertainment";
		beforeAll(async () => {
			await dataStore.addClientToChannel({ clientId, channel });
			await dataStore.addClientToChannel({
				clientId: otherClientId,
				channel,
			});
			await dataStore.removeClientFromChannel({ clientId, channel });
		});

		it("should remove the clientID value from the channel key in the channels hash", async () => {
			const encodedValues = await redis.hGet(dataStore.channelsKey, channel);
			if (!encodedValues) {
				throw new Error(`No values found for hash: ${hash}, key: ${key}`);
			}
			const values = decode(encodedValues);
			assert.deepStrictEqual(values, [otherClientId]);
		});
		it("should remove the channel value from the clientId key in the clients hash", async () => {
			const encodedValues = await redis.hGet(dataStore.clientsKey, clientId);
			if (!encodedValues) {
				throw new Error(`No values found for hash: ${hash}, key: ${key}`);
			}
			const values = decode(encodedValues);
			assert.deepStrictEqual(values, []);
		});
	});

	describe("#getClientIdsForChannel", () => {
		it("should return the client ids that are subscribed to a channel", async () => {
			const clientIds = await dataStore.getClientIdsForChannel("business");
			assert.deepStrictEqual(clientIds, ["zzz"]);
		});
	});

	describe("#getChannelsForClientId", () => {
		it("should return the channels that a clientId has subscribed to", async () => {
			const channels = await dataStore.getChannelsForClientId("zzz");
			assert.deepStrictEqual(channels, ["business"]);
		});
	});

	describe("#getBanRules", () => {
		beforeAll(async () => {
			await dataStore.clearBanRules();
		});
		afterAll(async () => {
			await dataStore.clearBanRules();
		});

		describe("when there are no rules yet", () => {
			it("should return an empty array", async () => {
				const existingBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(existingBanRules, []);
			});
		});

		describe("when there are rules", () => {
			it("should return an array containing rules", async () => {
				const banRule = {
					clientId: "xxx",
					host: "app.local",
					ipAddress: "127.0.0.1",
				};
				await dataStore.addBanRule(banRule);
				const latestBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(latestBanRules, [banRule]);
			});
		});
	});

	describe("#clearBanRules", () => {
		it("should remove all of the rules", async () => {
			const banRule = {
				clientId: "xxx",
				host: "app.local",
				ipAddress: "127.0.0.1",
			};
			await dataStore.addBanRule(banRule);
			const currentBanRules = await dataStore.getBanRules();
			assert.deepStrictEqual(currentBanRules, [banRule]);
			await dataStore.clearBanRules();
			const latestBanRules = await dataStore.getBanRules();
			assert.deepStrictEqual(latestBanRules, []);
		});
	});

	describe("#hasBanRule", () => {
		afterAll(async () => {
			await dataStore.clearBanRules();
		});
		const banRule = {
			clientId: "xxx",
			host: "app.local",
			ipAddress: "127.0.0.1",
		};

		describe("when the ban rules list has the ban rule", () => {
			it("should return true", async () => {
				await dataStore.addBanRule(banRule);
				const ruleExists = await dataStore.hasBanRule(banRule);
				assert.strictEqual(ruleExists, true);
			});
		});

		describe("when the ban rules list does not have the ban rule", () => {
			it("should return false", async () => {
				const ruleExists = await dataStore.hasBanRule({
					clientId: banRule.clientId,
					host: banRule.host,
				});
				assert.strictEqual(ruleExists, false);
			});
		});

		describe("when given a ban rule with just one or two properties", () => {
			const broaderBanRule = {
				clientId: "yyy",
			};
			const itemToCheck = {
				clientId: "yyy",
				host: "test.local",
				ipAddress: "127.0.0.2",
			};

			const anotherItemToCheck = {
				clientId: "zzz",
				host: "test.local",
				ipAddress: "127.0.0.2",
			};

			describe("and the ban rule is matched", () => {
				it("should return true", async () => {
					await dataStore.addBanRule(broaderBanRule);
					const ruleExists = await dataStore.hasBanRule(itemToCheck);
					assert.strictEqual(ruleExists, true);
				});
			});

			describe("and the ban rule is not matched", () => {
				it("should return false", async () => {
					const ruleExists = await dataStore.hasBanRule(anotherItemToCheck);
					assert.strictEqual(ruleExists, false);
				});
			});
		});
	});

	describe("#addBanRule", () => {
		beforeAll(async () => {
			await dataStore.clearBanRules();
		});

		const banRule = {
			clientId: "xxx",
			host: "app.local",
			ipAddress: "127.0.0.1",
		};
		describe("when the rule is new", () => {
			it("should be added to the list of banRules", async () => {
				const existingBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(existingBanRules, []);
				await dataStore.addBanRule(banRule);
				const latestBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(latestBanRules, [banRule]);
			});
		});

		describe("when the same rule has been added before", () => {
			it("should not be added to the existing list of banRules", async () => {
				const existingBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(existingBanRules, [banRule]);
				await dataStore.addBanRule(banRule);
				const latestBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(latestBanRules, [banRule]);
			});
		});
	});

	describe("#removeBanRule", () => {
		beforeAll(async () => {
			await dataStore.clearBanRules();
		});

		afterAll(async () => {
			await dataStore.clearBanRules();
		});

		describe("when a ban rule is found for removal", () => {
			it("should be removed from the list of ban rules, and return the ban rule that was removed", async () => {
				const banRule = {
					clientId: "xxx",
					host: "app.local",
					ipAddress: "127.0.0.1",
				};
				await dataStore.addBanRule(banRule);
				const removedBanRule = await dataStore.removeBanRule(banRule);
				assert.deepStrictEqual(removedBanRule, banRule);
				const latestBanRules = await dataStore.getBanRules();
				assert.deepStrictEqual(latestBanRules, []);
			});
		});

		describe("when a ban rule is not found for removal", () => {
			it("should return null", async () => {
				const banRule = {
					clientId: "yyy",
					host: "app.local",
					ipAddress: "127.0.0.1",
				};
				const removedBanRule = await dataStore.removeBanRule(banRule);
				assert.deepStrictEqual(removedBanRule, null);
			});
		});
	});
});
