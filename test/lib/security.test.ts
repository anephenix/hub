// Dependencies
import assert from "node:assert";
import dataStores from "../../src/lib/dataStores";
import { Security } from "../../src/lib/security";
import { describe, it } from "vitest";

// Setup
const DataStore = dataStores.memory;
const dataStore = new DataStore();
const security = new Security({ dataStore });

describe("security", () => {
	describe("#ban", () => {
		it("should add the rule to the list of ban rules", async () => {
			const banRule = {
				clientId: "xxx",
				host: "app.local",
				ipAddress: "127.0.0.1",
			};
			await security.ban(banRule);
			const banRuleExists = await dataStore.hasBanRule(banRule);
			assert.strictEqual(banRuleExists, true);
		});
	});
});
