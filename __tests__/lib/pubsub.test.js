const assert = require('assert');
const pubsub = require('../../lib/pubsub');

describe('pubsub', () => {
	describe('#subscribe', () => {
		describe('when passed a clientId and a channel', () => {
			it('should add a client to a channel', () => {
				let sentPayload = null;
				const data = { channel: 'sport' };
				const ws = {
					clientId: 'xxxx',
					send: (payload) => (sentPayload = JSON.parse(payload)),
				};
				pubsub.subscribe({ data, ws });
				assert(sentPayload.success);
				assert.strictEqual(
					sentPayload.message,
					'Client "xxxx" subscribed to channel "sport"'
				);
				assert.deepStrictEqual(pubsub.channels.sport, ['xxxx']);
				assert.deepStrictEqual(pubsub.clients.xxxx, ['sport']);
			});
		});

		describe('when the websocket does not have a client id', () => {
			it('should return an error response indicating that the websocket does not have an id', () => {
				let sentPayload = null;
				const data = { channel: 'weather' };
				const ws = {
					send: (payload) => (sentPayload = JSON.parse(payload)),
				};
				pubsub.subscribe({ data, ws });
				assert.strictEqual(sentPayload.success, false);
				assert.strictEqual(
					sentPayload.message,
					'No client id was found on the WebSocket'
				);
			});
		});

		describe('when the channel is not passed', () => {
			it('should return an error response indicating that the channel was not passed', () => {
				let sentPayload = null;
				const data = {};
				const ws = {
					clientId: 'yyyy',
					send: (payload) => (sentPayload = JSON.parse(payload)),
				};
				pubsub.subscribe({ data, ws });
				assert.strictEqual(sentPayload.success, false);
				assert.strictEqual(
					sentPayload.message,
					'No channel was passed in the data'
				);
			});
		});

		describe('when a client makes multiple attempts to subscribe to the same channel', () => {
			it('should only record a single entry of the client id in the channel subscriptions, and vice versa', () => {
				let sentPayload = null;
				const data = { channel: 'entertainment' };
				const ws = {
					clientId: 'zzzz',
					send: (payload) => (sentPayload = JSON.parse(payload)),
				};
				pubsub.subscribe({ data, ws });
				pubsub.subscribe({ data, ws });
				assert(sentPayload.success);
				assert.strictEqual(
					sentPayload.message,
					'Client "zzzz" subscribed to channel "entertainment"'
				);
				assert.deepStrictEqual(pubsub.channels.entertainment, ['zzzz']);
				assert.deepStrictEqual(pubsub.clients.zzzz, ['entertainment']);
			});
		});
	});
});
