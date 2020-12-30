// Dependencies
const assert = require('assert');
const dataStores = require('../../lib/dataStores');
const Security = require('../../lib/security');

// Setup
const DataStore = dataStores['memory'];
const dataStore = new DataStore({});
const security = new Security({ dataStore });

describe('security', () => {
	describe('#ban', () => {
		it('should add the rule to the list of ban rules', async () => {
			const banRule = {
				clientId: 'xxx',
				host: 'app.local',
				ipAddress: '127.0.0.1',
			};
			await security.ban(banRule);
			const banRuleExists = await dataStore.hasBanRule(banRule);
			assert.strictEqual(banRuleExists, true);
		});
	});
});
