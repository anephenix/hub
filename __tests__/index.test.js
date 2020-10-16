const assert = require('assert');
const { Hub, HubClient } = require('../index');
const httpShutdown = require('http-shutdown');
const WebSocket = require('ws');
const { delayUntil } = require('../helpers/delay');
const { RedisClient } = require('redis');

describe('Hub', () => {
	it('should return a class function', () => {
		assert.strictEqual(typeof Hub, 'function');
		assert(Hub instanceof Object);
		assert.strictEqual(
			Object.getOwnPropertyNames(Hub).includes('arguments'),
			false
		);
	});

	describe('an instance of Hub', () => {
		const hub = new Hub({ port: 4000 });
		it('should initialize a http server by default', () => {
			assert(hub.server);
		});
		it('should initialize a websocket server by default', () => {
			assert(hub.wss);
		});
		it('should attach event listener bindings to the websocket server', () => {
			assert(hub.serverEventListeners.connection.length > 0);
			assert(hub.serverEventListeners.listening.length === 0);
			assert(hub.serverEventListeners.headers.length === 0);
			assert(hub.serverEventListeners.error.length === 0);
			assert(hub.serverEventListeners.close.length === 0);
			assert(hub.connectionEventListeners.message.length > 0);
			assert(hub.connectionEventListeners.error.length === 0);
			assert(hub.connectionEventListeners.close.length === 0);
			assert.strictEqual(hub.wss._eventsCount, 5);
		});
		describe('#listen', () => {
			let runningServer = httpShutdown(hub.listen());

			afterAll(() => {
				runningServer.shutdown();
			});

			it('should listen on the given port, and return the server', async () => {
				let connected = false;
				const client = new WebSocket('ws://localhost:4000');
				client.onopen = () => {
					connected = true;
				};
				await delayUntil(() => client.readyState === 1);
				assert(connected);
				client.close();
			});

			it('should attach the connection event listeners', async () => {
				let connected = false;
				const messages = [];
				const client = new WebSocket('ws://localhost:4000');
				client.onopen = () => {
					connected = true;
				};
				client.onmessage = (event) => {
					messages.push(JSON.parse(event.data));
				};
				await delayUntil(() => client.readyState === 1);
				assert(connected);
				const latestMessage = messages[messages.length - 1];
				assert(latestMessage.action === 'get-client-id');
				client.send(
					JSON.stringify({
						action: 'get-client-id',
						data: { clientId: null },
					})
				);
				client.close();
			});
		});
	});

	describe('initialising with redis data store options', () => {

		let hub;
		let hubClient;
		beforeAll(() => {
			hub = new Hub({
				port: 4005,
				dataStoreType: 'redis',
				dataStoreOptions: {
					redisConfig: {
						db: 1
					}
				}
			});
			hub.listen();
			hubClient = new HubClient({ url: 'ws://localhost:4005' });
		});

		afterAll(async () => {
			const { redis, channelsKey, clientsKey } = hub.pubsub.dataStore;
			await redis.delAsync(channelsKey);
			await redis.delAsync(clientsKey);
			await hub.pubsub.dataStore.redis.quit();
		});

		it('should have a redis client', () => {
			assert(hub.pubsub.dataStore.redis instanceof RedisClient);
		});

		it('should handle subscribing a client to a channel', async () => {
			await delayUntil(() => hubClient.getClientId() !== null);
			const response = await hubClient.subscribe('news');
			assert(response.success);
		});

		it('should handle a client publishing a message to a channel', async () => {
			let called = false;
			hubClient.addChannelMessageHandler('news', () => {
				called = true;
			});
			await hubClient.publish('news', 'rain is on the way');
			assert(called);
		});

		it('should handle the server publishing a message to a channel', async () => {
			let called = false;
			hubClient.addChannelMessageHandler('news', () => {
				called = true;
			});
			await hub.pubsub.publish({ data: { channel: 'news', message: 'rain is on the way' } });
			await delayUntil(() => called, 5000);
		});

		it('should handle unsubscribing a client from a channel', async () => {
			const response = await hubClient.unsubscribe('news');
			assert(response.success);
		});

	});
});
