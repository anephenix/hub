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
			it.todo(
				'should return an error response indicating that the websocket does not have an id'
			);
		});

		describe('when the channel is not passed', () => {
			it.todo(
				'should return an error response indicating that the channel was not passed'
			);
		});

		describe('when a client makes multiple attempts to subscribe to the same channel', () => {
			it.todo(
				'should only record a single entry of the client id in the channel subscriptions, and vice versa'
			);
		});
	});
});
