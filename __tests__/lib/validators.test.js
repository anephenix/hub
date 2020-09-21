const assert = require('assert');
const {
	auditServerEventListeners,
	auditConnectionEventListeners,
} = require('../../lib/validators');

describe('validators', () => {
	describe('auditServerEventListeners', () => {
		describe('when the serverEventListeners parameter is undefined', () => {
			it('should return null', () => {
				assert.strictEqual(auditServerEventListeners(), null);
			});
		});

		describe('when the serverEventListeners parameter is not an object', () => {
			it('should throw an error', () => {
				assert.throws(() => {
					return auditServerEventListeners([]);
				});
			});
		});

		describe('when the serverEventListeners parameter is an object', () => {
			describe('for each required key, when the key is not present', () => {
				it('should set an empty array for that key', () => {
					assert.deepStrictEqual(auditServerEventListeners({}), {
						listening: [],
						connection: [],
						headers: [],
						error: [],
						close: [],
					});
				});
			});

			describe('for each required key, when the key is present', () => {
				describe('when the key value is not an array', () => {
					it('should throw an error', () => {
						assert.throws(() => {
							return auditServerEventListeners({
								listening: {},
							});
						});
					});
				});

				describe('when the key is an array', () => {
					it('should throw an error if it contains something other than functions', () => {
						assert.throws(() => {
							return auditServerEventListeners({
								listening: [{}],
							});
						});
					});
				});
			});
		});
	});

	describe('auditConnectionEventListeners', () => {
		describe('when the connectionEventListeners parameter is undefined', () => {
			it('should return null', () => {
				assert.strictEqual(auditConnectionEventListeners(), null);
			});
		});

		describe('when the connectionEventListeners parameter is not an object', () => {
			it('should throw an error', () => {
				assert.throws(() => {
					return auditConnectionEventListeners([]);
				});
			});
		});

		describe('when the connectionEventListeners parameter is an object', () => {
			describe('for each required key, when the key is not present', () => {
				it('should set an empty array for that key', () => {
					assert.deepStrictEqual(auditConnectionEventListeners({}), {
						message: [],
						error: [],
						close: [],
					});
				});
			});

			describe('for each required key, when the key is present', () => {
				describe('when the key value is not an array', () => {
					it('should throw an error', () => {
						assert.throws(() => {
							return auditConnectionEventListeners({
								message: {},
							});
						});
					});
				});

				describe('when the key is an array', () => {
					it('should throw an error if it contains something other than functions', () => {
						assert.throws(() => {
							return auditConnectionEventListeners({
								message: [{}],
							});
						});
					});
				});
			});
		});
	});
});
