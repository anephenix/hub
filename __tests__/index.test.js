const assert = require('assert');
const http = require('http');
const https = require('https');
const { Hub, HubClient } = require('../index');
const httpShutdown = require('http-shutdown');
const WebSocket = require('ws');
const { delayUntil } = require('../helpers/delay');
const { RedisClient } = require('redis');
const { delay } = require('bluebird');
const { checkHasClientId } = require('../lib/clientId');
const fs = require('fs');
const path = require('path');

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
			assert(hub.serverEventListeners.connection.length === 1);
			assert(hub.serverEventListeners.listening.length === 0);
			assert(hub.serverEventListeners.headers.length === 0);
			assert(hub.serverEventListeners.error.length === 0);
			assert(hub.serverEventListeners.close.length === 0);
			assert(hub.connectionEventListeners.message.length > 0);
			assert(hub.connectionEventListeners.error.length === 0);
			assert(hub.connectionEventListeners.close.length === 1);
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

			it('should attach the hasClientId rpc action', () => {
				assert.deepStrictEqual(hub.rpc.actions['has-client-id'], [
					checkHasClientId,
				]);
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
						db: 1,
					},
				},
			});
			hub.listen();
			hubClient = new HubClient({ url: 'ws://localhost:4005' });
		});

		afterAll(async () => {
			const { redis, channelsKey, clientsKey } = hub.pubsub.dataStore;
			await redis.delAsync(channelsKey);
			await redis.delAsync(clientsKey);
			hubClient.sarus.disconnect();
			hub.server.close();
			// We delay so that the client can be unsubscribed
			await delay(100);
			try {
				await hub.pubsub.dataStore.internalRedis.quitAsync();
				await hub.pubsub.dataStore.redis.quitAsync();
			} catch (err) {
				console.error(err);
			}
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
			await delayUntil(() => called);
		});

		it('should handle the server publishing a message to a channel', async () => {
			let called = false;
			hubClient.addChannelMessageHandler('news', () => {
				called = true;
			});
			await hub.pubsub.publish({
				data: { channel: 'news', message: 'rain is on the way' },
			});
			await delayUntil(() => called, 5000);
		});

		it('should handle unsubscribing a client from a channel', async () => {
			const response = await hubClient.unsubscribe('news');
			assert(response.success);
		});
	});

	describe('when a client disconnects from the server', () => {
		it('should unsubscribe that client from any channels they were subscribed to', async () => {
			const newHub = await new Hub({
				port: 5002,
				dataStoreType: 'memory',
			});
			newHub.listen();
			const hubClient = new HubClient({ url: 'ws://localhost:5002' });
			// await delayUntil(() => hubClient.sarus.ws.readyState === 1);
			// await delayUntil(() => {
			// 	return hubClient.getClientId();
			// });

			await hubClient.isReady();
			await hubClient.subscribe('accounts');
			hubClient.sarus.disconnect();
			await delay(100);
			const channels = await newHub.pubsub.dataStore.getChannelsForClientId(
				hubClient.getClientId()
			);
			const clientIds = await newHub.pubsub.dataStore.getClientIdsForChannel(
				'accounts'
			);
			assert.deepStrictEqual(channels, []);
			assert.deepStrictEqual(clientIds, []);
			newHub.server.close();
		});
	});

	describe('server option', () => {
		const serverOptions = {
			key: fs.readFileSync(
				path.join(process.cwd(), 'certs', 'localhost+2-key.pem')
			),
			cert: fs.readFileSync(
				path.join(process.cwd(), 'certs', 'localhost+2.pem')
			),
		};

		describe('when no option is passed', () => {
			it('should load a http server by default', async () => {
				const plainHub = await new Hub({ port: 5003 });
				assert(plainHub.server instanceof http.Server);
				assert.strictEqual(plainHub.protocol, 'ws');
			});
		});

		describe('when http is passed', () => {
			it('should load a http server', async () => {
				const plainHub = await new Hub({ port: 5003, server: 'http' });
				assert(plainHub.server instanceof http.Server);
				assert.strictEqual(plainHub.protocol, 'ws');
			});
		});

		describe('when a http server is passed', () => {
			it('should load that http server', async () => {
				const httpServer = http.createServer();
				const plainHub = await new Hub({
					port: 5003,
					server: httpServer,
				});
				assert(plainHub.server instanceof http.Server);
				assert.deepStrictEqual(plainHub.server, httpServer);
				assert.strictEqual(plainHub.protocol, 'ws');
			});
		});

		describe('when https is passed', () => {
			it('should load a https server initialialised with the serverOptions', async () => {
				const secureHub = await new Hub({
					port: 5003,
					server: 'https',
					serverOptions,
				});
				assert(secureHub.server instanceof https.Server);
				assert.strictEqual(secureHub.protocol, 'wss');
			});
		});

		describe('when a https server is passed', () => {
			it('should load that https server', async () => {
				const httpsServer = https.createServer(serverOptions);
				const secureHub = await new Hub({
					port: 5003,
					server: httpsServer,
				});
				assert(secureHub.server instanceof https.Server);
				assert.deepStrictEqual(secureHub.server, httpsServer);
				assert.strictEqual(secureHub.protocol, 'wss');
			});
		});

		describe('when an invalid server option is passed', () => {
			it('should throw an error', async () => {
				try {
					await new Hub({ port: 5003, server: 'secure' });
					assert(false, 'Should not reach this point');
				} catch (err) {
					assert.strictEqual(
						err.message,
						'Invalid option passed for server'
					);
				}
			});
		});
	});

	describe('setHostAndIp', () => {
		let hub;
		let hubClient;
		beforeAll(() => {
			hub = new Hub({
				port: 4009,
			});
			hub.listen();
			hubClient = new HubClient({ url: 'ws://localhost:4009' });
		});

		afterAll(async () => {
			hubClient.sarus.disconnect();
			hub.server.close();
			await delay(100);
		});

		it('should set the hostname and ip address on the websocket client', async () => {
			await hubClient.isReady();
			const ws = Array.from(hub.wss.clients)[0];
			assert.strictEqual(ws.host, 'localhost:4009');
			assert.strictEqual(ws.ipAddress, '::ffff:127.0.0.1');
		});
	});

	describe('kick', () => {
		let hub;
		let hubClient;
		const messages = [];

		beforeAll(async () => {
			hub = new Hub({
				port: 4010,
			});
			hub.listen();
			hubClient = new HubClient({ url: 'ws://localhost:4010' });
			hubClient.sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});

			await hubClient.isReady();
			const ws = Array.from(hub.wss.clients)[0];
			await hub.kick({ ws });
			await delay(100);
		});

		afterAll(async () => {
			hub.server.close();
			await delay(25);
		});

		it('should send a RPC action to the client to stop them from automatically reconnecting', async () => {
			const lastMessage = messages[messages.length - 1];
			assert.strictEqual(lastMessage.type, 'request');
			assert.strictEqual(lastMessage.action, 'kick');
			assert.strictEqual(
				lastMessage.data,
				'Server has kicked the client'
			);
		});

		it('should then close the websocket connection to the client', async () => {
			assert.strictEqual(hubClient.sarus.ws.readyState, 3);
		});
	});

	describe('kickAndBan', () => {
		let hub;
		let hubClient;
		let ws;

		beforeAll(async () => {
			hub = new Hub({
				port: 4011,
			});
			hub.listen();
			hubClient = new HubClient({ url: 'ws://localhost:4011' });
			await hubClient.isReady();
			ws = Array.from(hub.wss.clients)[0];
			await hub.kickAndBan({ ws });
			await delay(100);
		});

		it('should add the client to the ban list', async () => {
			const { clientId, host, ipAddress } = ws;
			assert(ws.clientId !== null);
			const hasBeenBanned = await hub.dataStore.hasBanRule({
				clientId,
				host,
				ipAddress,
			});
			await delayUntil(() => {return hasBeenBanned;});
		});

		it('should then kick the client', () => {
			assert.strictEqual(hubClient.sarus.ws.readyState, 3);
		});
	});

	describe('kickIfBanned', () => {
		let hub;
		let hubClient;
		let ws;

		beforeAll(async () => {
			hub = new Hub({
				port: 4012,
			});
			hub.listen();
		});

		describe('when the client is not banned', () => {
			it('should allow the client to proceed', async () => {
				hubClient = new HubClient({ url: 'ws://localhost:4012' });
				await hubClient.isReady();
				ws = Array.from(hub.wss.clients)[0];
				await delay(100);
				assert.strictEqual(hubClient.sarus.ws.readyState, 1);
			});
		});

		describe('when the client is banned', () => {
			it('should not allow the client to proceed, and kick them off', async () => {
				await hub.kickAndBan({ ws });
				await delay(100);
				hubClient.sarus.connect();
				await delay(100);
				assert.strictEqual(hubClient.sarus.ws.readyState, 3);
			});
		});
	});
});
