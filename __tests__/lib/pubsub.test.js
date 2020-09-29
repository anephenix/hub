const assert = require('assert');
const Hub = require('../../index');

describe('pubsub', () => {
	let hub;

	beforeAll(() => {
		hub = new Hub({ port: 5000 });
	});

	describe('#subscribe', () => {
		describe('when passed a clientId and a channel', () => {
			// NOTE - might have to do real WebSocket connections now
			it('should add a client to a channel', () => {
				let sentPayload = null;
				const data = { channel: 'sport' };
				const ws = {
					clientId: 'xxxx',
					send: (payload) => (sentPayload = JSON.parse(payload)),
				};
				const secondWs = {
					clientId: 'wwww',
					send: () => {},
				};
				const secondData = { channel: 'business' };
				hub.pubsub.subscribe({ data, ws });
				assert(sentPayload.success);
				assert.strictEqual(
					sentPayload.message,
					'Client "xxxx" subscribed to channel "sport"'
				);
				assert.deepStrictEqual(hub.pubsub.channels.sport, ['xxxx']);
				assert.deepStrictEqual(hub.pubsub.clients.xxxx, ['sport']);
				hub.pubsub.subscribe({ data, ws: secondWs });
				hub.pubsub.subscribe({ data: secondData, ws });
				assert.deepStrictEqual(hub.pubsub.channels.sport, [
					'xxxx',
					'wwww',
				]);
				assert.deepStrictEqual(hub.pubsub.clients.wwww, ['sport']);
				assert.deepStrictEqual(hub.pubsub.channels.business, ['xxxx']);
				assert.deepStrictEqual(hub.pubsub.clients.xxxx, [
					'sport',
					'business',
				]);
			});
		});

		describe('when the websocket does not have a client id', () => {
			it('should return an error response indicating that the websocket does not have an id', () => {
				let sentPayload = null;
				const data = { channel: 'weather' };
				const ws = {
					send: (payload) => (sentPayload = JSON.parse(payload)),
				};
				hub.pubsub.subscribe({ data, ws });
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
				hub.pubsub.subscribe({ data, ws });
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
				hub.pubsub.subscribe({ data, ws });
				hub.pubsub.subscribe({ data, ws });
				assert(sentPayload.success);
				assert.strictEqual(
					sentPayload.message,
					'Client "zzzz" subscribed to channel "entertainment"'
				);
				assert.deepStrictEqual(hub.pubsub.channels.entertainment, [
					'zzzz',
				]);
				assert.deepStrictEqual(hub.pubsub.clients.zzzz, [
					'entertainment',
				]);
			});
		});
	});

	describe('#publish', () => {
		// For this, the ws client needs to be real, as they need to receive 2 messages (one for acknowledgement of publish, and another for the actual message)
		it.todo(
			'should allow the client to publish a message to all of the channel subscribers, including themselves'
		);
		it.todo(
			'should allow the client to publish a message to all of the channel subscribers, excluding themselves'
		);
		it.todo(
			'should allow the server to publish a message to all of the channel subscribers'
		);
	});
});
