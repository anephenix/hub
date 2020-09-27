// Dependencies
const assert = require('assert');
const { parseMessage } = require('../../lib/messageParsing');

describe('messageParsing', () => {
	describe('#parseMessage', () => {
		describe('when it does not receive a valid JSON payload', () => {
			it('should return an error', () => {
				const ws = {};
				const message = '20fh02nd0n10i0i1ns0n10n010d-1d-1-d-1nd-1-dn'; // Not JSON
				const response = parseMessage({ ws, message });
				assert.strictEqual(response.success, false);
				assert.strictEqual(
					response.message,
					'Error parsing message received from client'
				);
			});
		});
		describe('when it receives a valid JSON payload', () => {
			it('should parse the payload, and action it if the payload is a reply for a client id request', () => {
				const ws = {};
				const message = JSON.stringify({
					action: 'reply-client-id',
					data: { clientId: 'abc' },
				});
				parseMessage({ ws, message });
				assert(ws.clientId === 'abc');
			});
		});
		describe('when it receives a valid JSON payload, but an unsupported action', () => {
			it('should parse the payload, but log that no action was taken', () => {
				const ws = {};
				const message = JSON.stringify({
					action: 'some-unhandled-actions',
					data: { clientId: 'abc' },
				});
				const response = parseMessage({ ws, message });
				assert.strictEqual(response.success, false);
				assert.strictEqual(
					response.message,
					'No action will be taken as the data structure does not match the expected pattern'
				);
			});
		});
	});
});
