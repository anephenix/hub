// Dependencies
import assert from "node:assert";
import MemoryDataStore from "../../../src/lib/dataStores/memory";
import { describe, it, beforeAll, afterAll } from "vitest";

describe("memory data store", () => {
	const memoryStore = new MemoryDataStore();
	const hash: Record<string, any[]> = memoryStore.channels;
	const key = "news";
	const value = "xxx";
	const anotherValue = "yyy";

	it("should initialise with an empty set of clients and channels", () => {
		assert.deepStrictEqual(memoryStore.channels, {});
		assert.deepStrictEqual(memoryStore.clients, {});
	});

	describe("#addItemToCollection", () => {
		describe("when the key does not exist on the hash", () => {
			it("should set the hash key to an array containing the passed value", async () => {
				await memoryStore.addItemToCollection({
					value,
					hash,
					key,
				});
				assert.deepStrictEqual(memoryStore.channels[key], [value]);
			});
		});

		describe("when the key exists on the hash", () => {
			it("should append the value to the existing values of the hash key", async () => {
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

	describe("#removeItemFromCollection", () => {
		it("should remove the value from the values of the hash key", async () => {
			await memoryStore.removeItemFromCollection({
				value,
				hash,
				key,
			});
			assert.deepStrictEqual(memoryStore.channels[key], [anotherValue]);
		});

		it("should do nothing if passed a hash and key that have no existing values", async () => {
			const copyofChannels = { ...memoryStore.channels };
			await memoryStore.removeItemFromCollection({
				value,
				hash: "foo" as any,
				key: "bar",
			});
			assert.deepStrictEqual(copyofChannels, memoryStore.channels);
		});

		it("should do nothing if passed a hash and key that have no existing values", async () => {
			const copyofChannels = { ...memoryStore.channels };
			await memoryStore.removeItemFromCollection({
				value: "baz",
				hash,
				key,
			});
			assert.deepStrictEqual(copyofChannels, memoryStore.channels);
		});
	});

	describe("#addClientToChannel", () => {
		const clientId = "zzz";
		const channel = "business";
		beforeAll(async () => {
			await memoryStore.addClientToChannel({ clientId, channel });
		});

		it("should add the clientID value to the channel key in the channels hash", () => {
			assert.deepStrictEqual(memoryStore.channels[channel], [clientId]);
		});
		it("should add the channel value to the clientId key in the clients hash", () => {
			assert.deepStrictEqual(memoryStore.clients[clientId], [channel]);
		});
	});

	describe("#removeClientFromChannel", () => {
		const clientId = "aaa";
		const otherClientId = "bbb";
		const channel = "entertainment";
		beforeAll(async () => {
			await memoryStore.addClientToChannel({ clientId, channel });
			await memoryStore.addClientToChannel({
				clientId: otherClientId,
				channel,
			});
			await memoryStore.removeClientFromChannel({ clientId, channel });
		});

		it("should remove the clientID value from the channel key in the channels hash", () => {
			assert.deepStrictEqual(memoryStore.channels[channel], [otherClientId]);
		});
		it("should remove the channel value from the clientId key in the clients hash", () => {
			assert.deepStrictEqual(memoryStore.clients[clientId], []);
		});
	});

	describe("#getClientIdsForChannel", () => {
		it("should return the client ids that are subscribed to a channel", async () => {
			const clientIds = await memoryStore.getClientIdsForChannel("business");
			assert.deepStrictEqual(clientIds, ["zzz"]);
		});
	});

	describe("#getChannelsForClientId", () => {
		it("should return the channels that a clientId has subscribed to", async () => {
			const channels = await memoryStore.getChannelsForClientId("zzz");
			assert.deepStrictEqual(channels, ["business"]);
		});
	});

	describe("#getBanRules", () => {
		afterAll(async () => {
			await memoryStore.clearBanRules();
		});

		describe("when there are no rules yet", () => {
			it("should return an empty array", async () => {
				const existingBanRules = await memoryStore.getBanRules();
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
				await memoryStore.addBanRule(banRule);
				const latestBanRules = await memoryStore.getBanRules();
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
			await memoryStore.addBanRule(banRule);
			const currentBanRules = await memoryStore.getBanRules();
			assert.deepStrictEqual(currentBanRules, [banRule]);
			await memoryStore.clearBanRules();
			const latestBanRules = await memoryStore.getBanRules();
			assert.deepStrictEqual(latestBanRules, []);
		});
	});

	describe("#hasBanRule", () => {
		afterAll(async () => {
			await memoryStore.clearBanRules();
		});
		const banRule = {
			clientId: "xxx",
			host: "app.local",
			ipAddress: "127.0.0.1",
		};

		describe("when the ban rules list has the ban rule", () => {
			it("should return true", async () => {
				await memoryStore.addBanRule(banRule);
				const ruleExists = await memoryStore.hasBanRule(banRule);
				assert.strictEqual(ruleExists, true);
			});
		});

		describe("when the ban rules list does not have the ban rule", () => {
			it("should return false", async () => {
				const ruleExists = await memoryStore.hasBanRule({
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
					await memoryStore.addBanRule(broaderBanRule);
					const ruleExists = await memoryStore.hasBanRule(itemToCheck);
					assert.strictEqual(ruleExists, true);
				});
			});

			describe("and the ban rule is not matched", () => {
				it("should return false", async () => {
					const ruleExists = await memoryStore.hasBanRule(anotherItemToCheck);
					assert.strictEqual(ruleExists, false);
				});
			});
		});
	});

	describe("#addBanRule", () => {
		const banRule = {
			clientId: "xxx",
			host: "app.local",
			ipAddress: "127.0.0.1",
		};

		describe("when the rule is new", () => {
			it("should be added to the list of banRules", async () => {
				const existingBanRules = await memoryStore.getBanRules();
				assert.deepStrictEqual(existingBanRules, []);
				await memoryStore.addBanRule(banRule);
				const latestBanRules = await memoryStore.getBanRules();
				assert.deepStrictEqual(latestBanRules, [banRule]);
			});
		});

		describe("when the same rule has been added before", () => {
			it("should not be added to the existing list of banRules", async () => {
				const existingBanRules = await memoryStore.getBanRules();
				assert.deepStrictEqual(existingBanRules, [banRule]);
				await memoryStore.addBanRule(banRule);
				const latestBanRules = await memoryStore.getBanRules();
				assert.deepStrictEqual(latestBanRules, [banRule]);
			});
		});
	});

	describe("#removeBanRule", () => {
		describe("when a ban rule is found for removal", () => {
			it("should be removed from the list of ban rules, and return the ban rule that was removed", async () => {
				const banRule = {
					clientId: "xxx",
					host: "app.local",
					ipAddress: "127.0.0.1",
				};
				await memoryStore.addBanRule(banRule);
				const removedBanRule = await memoryStore.removeBanRule(banRule);
				assert.deepStrictEqual(removedBanRule, banRule);
				const latestBanRules = await memoryStore.getBanRules();
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
				const removedBanRule = await memoryStore.removeBanRule(banRule);
				assert.deepStrictEqual(removedBanRule, null);
			});
		});
	});
});
