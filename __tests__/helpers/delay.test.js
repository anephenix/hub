// Dependencies
const assert = require('assert');
const { delayUntil } = require('../../helpers/delay');

describe('delay helpers', () => {
	describe('#delayUntil', () => {
		it('should throw an error if the timeout threshold is reached', async () => {
			try {
				await delayUntil(() => {
					return false;
				}, 1000);
				assert(false, 'Should not reach this point');
			} catch (err) {
				assert.strictEqual(
					err.message,
					'Condition did not resolve before the timeout'
				);
			}
		});
	});
});
