// Dependencies
const assert = require('assert');
const { Hub, HubClient } = require('../../index');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { delay, delayUntil } = require('../../helpers/delay');
const MemoryDataStore = require('../../lib/dataStores/memory');
const RedisDataStore = require('../../lib/dataStores/redis');
const httpShutdown = require('http-shutdown');

describe('pubsub', () => {
	let hub;
	let server;

	beforeAll(async () => {
		hub = new Hub({ port: 5000 });
		server = httpShutdown(hub.server);
		server.listen(5000);
	});

	afterAll((done) => {
		server.shutdown(done);
	});

	describe('#subscribe', () => {
		describe('when passed a clientId and a channel', () => {
			it('should add a client to a channel', async () => {
				const data = { channel: 'sport' };
				const socket = {
					clientId: 'xxxx',
				};
				const secondWs = {
					clientId: 'wwww',
				};
				const secondData = { channel: 'business' };
				const response = await hub.pubsub.subscribe({ data, socket });
				assert(response.success);
				assert.strictEqual(
					response.message,
					'Client "xxxx" subscribed to channel "sport"'
				);
				assert.deepStrictEqual(hub.pubsub.dataStore.channels.sport, [
					'xxxx',
				]);
				assert.deepStrictEqual(hub.pubsub.dataStore.clients.xxxx, [
					'sport',
				]);
				await hub.pubsub.subscribe({ data, socket: secondWs });
				await hub.pubsub.subscribe({ data: secondData, socket });
				assert.deepStrictEqual(hub.pubsub.dataStore.channels.sport, [
					'xxxx',
					'wwww',
				]);
				assert.deepStrictEqual(hub.pubsub.dataStore.clients.wwww, [
					'sport',
				]);
				assert.deepStrictEqual(hub.pubsub.dataStore.channels.business, [
					'xxxx',
				]);
				assert.deepStrictEqual(hub.pubsub.dataStore.clients.xxxx, [
					'sport',
					'business',
				]);
			});
		});

		describe('when the websocket does not have a client id', () => {
			it('should throw an error indicating that the websocket does not have an id', async () => {
				const data = { channel: 'weather' };
				const socket = {};
				assert.rejects(
					async () => {
						await hub.pubsub.subscribe({ data, socket });
					},
					{ message: 'No client id was found on the WebSocket' }
				);
			});
		});

		describe('when the channel is not passed', () => {
			it('should throw an error indicating that the channel was not passed', async () => {
				const data = {};
				const socket = {
					clientId: 'yyyy',
				};
				assert.rejects(
					async () => {
						await hub.pubsub.subscribe({ data, socket });
					},
					{ message: 'No channel was passed in the data' }
				);
			});
		});

		describe('when the channel has been added by the server with options', () => {
			it('should run a check against the authenticate function set for that channel', async () => {
				const channel = 'fish';
				let called = false;
				const authenticate = ({ data, socket }) => {
					assert.strictEqual(data.password, 'food');
					assert.strictEqual(socket.clientId, 'ooo');
					called = true;
					return called;
				};
				hub.pubsub.addChannelConfiguration({ channel, authenticate });

				const data = {
					channel,
					password: 'food',
				};
				const socket = {
					clientId: 'ooo',
				};
				await hub.pubsub.subscribe({ data, socket });
				assert(called);
				const channels = await hub.pubsub.dataStore.getChannelsForClientId(
					socket.clientId
				);
				assert(channels.indexOf('fish') !== -1);
			});
		});

		describe('when a client makes multiple attempts to subscribe to the same channel', () => {
			it('should only record a single entry of the client id in the channel subscriptions, and vice versa', async () => {
				const data = { channel: 'entertainment' };
				const socket = {
					clientId: 'zzzz',
				};
				const firstResponse = await hub.pubsub.subscribe({
					data,
					socket,
				});
				const secondResponse = await hub.pubsub.subscribe({
					data,
					socket,
				});
				assert(firstResponse.success);
				assert(secondResponse.success);
				const message =
					'Client "zzzz" subscribed to channel "entertainment"';
				assert.strictEqual(firstResponse.message, message);
				assert.strictEqual(secondResponse.message, message);
				assert.deepStrictEqual(
					hub.pubsub.dataStore.channels.entertainment,
					['zzzz']
				);
				assert.deepStrictEqual(hub.pubsub.dataStore.clients.zzzz, [
					'entertainment',
				]);
			});
		});
	});

	describe('#publish', () => {
		it('should allow the client to publish a message to all of the channel subscribers, including themselves', async () => {
			const messages = [];
			const hubClient = new HubClient({ url: 'ws://localhost:5000' });
			hubClient.sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delayUntil(() => hubClient.sarus.ws.readyState === 1);

			await delayUntil(() => {
				return (
					// eslint-disable-next-line no-undef
					window.localStorage.getItem('sarus-client-id') !== undefined
				);
			});
			// Subscribe the client to the channel
			await hubClient.subscribe('politics');
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.data.success, true);
			assert.strictEqual(
				latestMessage.data.message,
				`Client "${clientId}" subscribed to channel "politics"`
			);

			// Get the client to publish a message to the channel
			await hubClient.publish('politics', 'Elections held');
			// Check that the client receives the messages
			const thePreviousLatestMessage = messages[messages.length - 2];
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(thePreviousLatestMessage.action, 'message');
			assert.strictEqual(
				thePreviousLatestMessage.data.channel,
				'politics'
			);
			assert.strictEqual(
				thePreviousLatestMessage.data.message,
				'Elections held'
			);
			assert.strictEqual(theNextLatestMessage.action, 'publish');
			assert.strictEqual(theNextLatestMessage.data.success, true);
			hubClient.sarus.disconnect();
		});

		it('should allow the client to publish a message to all of the channel subscribers, excluding themselves', async () => {
			const messages = [];
			const hubClient = new HubClient({ url: 'ws://localhost:5000' });
			hubClient.sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delayUntil(() => hubClient.sarus.ws.readyState === 1);
			await delayUntil(() => {
				return (
					// eslint-disable-next-line no-undef
					window.localStorage.getItem('sarus-client-id') !== undefined
				);
			});
			// Subscribe the client to the channel
			await hubClient.subscribe('showbiz');
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.data.success, true);
			assert.strictEqual(
				latestMessage.data.message,
				`Client "${clientId}" subscribed to channel "showbiz"`
			);

			// Get the client to publish a message to the channel
			await hubClient.publish(
				'showbiz',
				'Oscars ceremony to be virtual',
				true
			);
			// Check that the client does not receive the message
			const thePreviousLatestMessage = messages[messages.length - 2];
			const theNextLatestMessage = messages[messages.length - 1];
			assert.notStrictEqual(thePreviousLatestMessage.action, 'message');
			assert.strictEqual(thePreviousLatestMessage.action, 'subscribe');
			assert.strictEqual(theNextLatestMessage.action, 'publish');
			assert.strictEqual(theNextLatestMessage.data.success, true);
			assert.strictEqual(
				theNextLatestMessage.data.message,
				'Published message'
			);
			hubClient.sarus.disconnect();
		});

		it('should allow the server to publish a message to all of the channel subscribers', async () => {
			const messages = [];
			const hubClient = new HubClient({ url: 'ws://localhost:5000' });
			hubClient.sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delayUntil(() => hubClient.sarus.ws.readyState === 1);

			await delayUntil(() => {
				return (
					// eslint-disable-next-line no-undef
					window.localStorage.getItem('sarus-client-id') !== undefined
				);
			});
			// Subscribe the client to the channel
			await hubClient.subscribe('markets');
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.data.success, true);
			assert.strictEqual(
				latestMessage.data.message,
				`Client "${clientId}" subscribed to channel "markets"`
			);
			// Get the server to publish a message to the channel
			await hub.pubsub.publish({
				data: { channel: 'markets', message: 'FTSE: 5845 (-5)' },
			});
			await delay(25);
			// Check that the client receives the message
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(theNextLatestMessage.action, 'message');
			assert.strictEqual(theNextLatestMessage.data.channel, 'markets');
			assert.strictEqual(
				theNextLatestMessage.data.message,
				'FTSE: 5845 (-5)'
			);
			hubClient.sarus.disconnect();
		});

		describe('when publishing from a client', () => {
			it('should return an error response if the websocket client id is not present', async () => {
				const messages = [];
				const client = new WebSocket('ws://localhost:5000');
				client.on('message', (event) => {
					const message = JSON.parse(event);
					messages.push(message);
				});
				const publishRequest = {
					id: uuidv4(),
					action: 'publish',
					type: 'request',
					data: {
						channel: 'sport',
						message: 'Something is happening',
					},
				};
				await delayUntil(() => client.readyState === 1);
				client.send(JSON.stringify(publishRequest));
				await delay(50);
				const latestMessage = messages[messages.length - 1];
				assert.strictEqual(latestMessage.type, 'error');
				assert.strictEqual(
					latestMessage.error,
					'No client id was found on the WebSocket'
				);
				client.close();
			});
			it('should return an error response if the channel is missing', async () => {
				const messages = [];
				const hubClient = new HubClient({ url: 'ws://localhost:5000' });
				hubClient.sarus.on('message', (event) => {
					const message = JSON.parse(event.data);
					messages.push(message);
				});
				await delayUntil(() => hubClient.sarus.ws.readyState === 1);
				await delayUntil(() => {
					return (
						// eslint-disable-next-line no-undef
						window.localStorage.getItem('sarus-client-id') !==
						undefined
					);
				});
				// Subscribe the client to the channel
				await hubClient.subscribe('showbiz');
				// Acknowledge the channel subscription
				// eslint-disable-next-line no-undef
				const clientId = window.localStorage.getItem('sarus-client-id');
				const latestMessage = messages[messages.length - 1];
				if (!latestMessage) throw new Error('No messages intercepted');
				assert.strictEqual(latestMessage.data.success, true);
				assert.strictEqual(
					latestMessage.data.message,
					`Client "${clientId}" subscribed to channel "showbiz"`
				);

				// Get the client to publish a message to the channel
				await hubClient.publish(null, 'Oscars ceremony to be virtual');
				// Check that the client receives the message
				const theNextLatestMessage = messages[messages.length - 1];
				assert.strictEqual(theNextLatestMessage.type, 'error');
				assert.strictEqual(
					theNextLatestMessage.error,
					'No channel was passed in the data'
				);
				hubClient.sarus.disconnect();
			});
			it('should return an error response if the message is missing', async () => {
				const messages = [];
				const hubClient = new HubClient({ url: 'ws://localhost:5000' });
				hubClient.sarus.on('message', (event) => {
					const message = JSON.parse(event.data);
					messages.push(message);
				});
				await delayUntil(() => hubClient.sarus.ws.readyState === 1);
				await delayUntil(() => {
					return (
						// eslint-disable-next-line no-undef
						window.localStorage.getItem('sarus-client-id') !==
						undefined
					);
				});
				// Subscribe the client to the channel
				await hubClient.subscribe('showbiz');
				// Acknowledge the channel subscription
				// eslint-disable-next-line no-undef
				const clientId = window.localStorage.getItem('sarus-client-id');
				const latestMessage = messages[messages.length - 1];
				if (!latestMessage) throw new Error('No messages intercepted');
				assert.strictEqual(latestMessage.data.success, true);
				assert.strictEqual(
					latestMessage.data.message,
					`Client "${clientId}" subscribed to channel "showbiz"`
				);
				// Get the client to publish a message to the channel
				await hubClient.publish('showbiz', null);
				// Check that the client receives the message
				const theNextLatestMessage = messages[messages.length - 1];
				assert.strictEqual(theNextLatestMessage.type, 'error');
				assert.strictEqual(
					theNextLatestMessage.error,
					'No message was passed in the data'
				);
				hubClient.sarus.disconnect();
			});

			it('should publish a message, even if there are no subscribers for that channel', async () => {
				const messages = [];
				const hubClient = new HubClient({ url: 'ws://localhost:5000' });
				hubClient.sarus.on('message', (event) => {
					const message = JSON.parse(event.data);
					messages.push(message);
				});
				await delayUntil(() => hubClient.sarus.ws.readyState === 1);
				await delayUntil(() => {
					return (
						// eslint-disable-next-line no-undef
						window.localStorage.getItem('sarus-client-id') !==
						undefined
					);
				});
				// eslint-disable-next-line no-undef
				const latestMessage = messages[messages.length - 1];
				if (!latestMessage) throw new Error('No messages intercepted');
				// Get the client to publish a message to the channel
				await hubClient.publish('dashboard_y', 'Some data');
				// Check that the client receives the message
				const theNextLatestMessage = messages[messages.length - 1];
				assert.strictEqual(theNextLatestMessage.type, 'response');
				assert.strictEqual(
					theNextLatestMessage.data.message,
					'Published message'
				);
				hubClient.sarus.disconnect();
			});
		});

		describe('when publishing from a server', () => {
			it('should return an error response if the channel is missing', async () => {
				assert.rejects(
					async () => {
						await hub.pubsub.publish({
							data: {
								message: 'FTSE: 5845 (-5)',
							},
						});
					},
					{ message: 'No channel was passed in the data' }
				);
			});

			it('should return an error response if the message is missing', async () => {
				assert.rejects(
					async () => {
						await hub.pubsub.publish({
							data: {
								channel: 'markets',
							},
						});
					},
					{ message: 'No message was passed in the data' }
				);
			});

			describe('publishing to a channel that has no subscribers', () => {
				it('should publish the message, even if there are no subscribers for that channel', async () => {
					await hub.pubsub.publish({
						data: {
							channel: 'dashboard_x',
							message: 'FTSE: 5845 (-5)',
						},
					});
				});
			});
		});

		describe('when using the redis dataStore', () => {
			let firstHub;
			let secondHub;
			let firstHubClient;
			let secondHubClient;

			beforeAll(async () => {
				firstHub = new Hub({ port: 4006, dataStoreType: 'redis' });
				secondHub = new Hub({ port: 4007, dataStoreType: 'redis' });
				firstHub.listen();
				secondHub.listen();
				firstHubClient = new HubClient({ url: 'ws://localhost:4006' });
				secondHubClient = new HubClient({ url: 'ws://localhost:4007' });
				await delayUntil(
					() =>
						firstHubClient.getClientId() !== null &&
						secondHubClient.getClientId() !== null
				);
			});

			afterAll(async () => {
				firstHubClient.sarus.disconnect();
				secondHubClient.sarus.disconnect();
				firstHub.server.close();
				secondHub.server.close();
				await delay(100);
				await firstHub.pubsub.dataStore.redis.quitAsync();
				await secondHub.pubsub.dataStore.redis.quitAsync();
				await firstHub.pubsub.dataStore.internalRedis.quitAsync();
				await secondHub.pubsub.dataStore.internalRedis.quitAsync();
			});

			it('should relay the published message to all Hub server instances via Redis', async () => {
				let firstClientMessage;
				let firstClientReceivesMessage = false;
				let secondClientMessage;
				let secondClientReceivesMessage = false;
				const firstClientHandlerFunction = (message) => {
					firstClientMessage = message;
					firstClientReceivesMessage = true;
				};
				firstHubClient.addChannelMessageHandler(
					'news',
					firstClientHandlerFunction
				);
				const secondClientHandlerFunction = (message) => {
					secondClientMessage = message;
					secondClientReceivesMessage = true;
				};
				secondHubClient.addChannelMessageHandler(
					'news',
					secondClientHandlerFunction
				);
				await firstHubClient.subscribe('news');
				await secondHubClient.subscribe('news');
				const message = 'Sunny weather on the way';
				await firstHub.pubsub.publish({
					data: {
						channel: 'news',
						message,
					},
				});
				await delayUntil(
					() =>
						firstClientReceivesMessage &&
						secondClientReceivesMessage
				);
				assert.strictEqual(firstClientMessage, message);
				assert.strictEqual(secondClientMessage, message);
			});
		});
	});

	describe('#unsubscribe', () => {
		it('should remove a client from a channel, and ensure that the client no longer receives messages for that channel', async () => {
			const messages = [];
			const config = { url: 'ws://localhost:5000' };
			const hubClient = new HubClient(config);
			hubClient.sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delayUntil(() => hubClient.sarus.ws.readyState === 1);
			await delayUntil(() => {
				return (
					// eslint-disable-next-line no-undef
					window.localStorage.getItem('sarus-client-id') !== undefined
				);
			});
			// Subscribe the client to the channel
			await hubClient.subscribe('markets');
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.data.success, true);
			assert.strictEqual(
				latestMessage.data.message,
				`Client "${clientId}" subscribed to channel "markets"`
			);
			// Subscribe the client to the channel
			await hubClient.unsubscribe('markets');
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(theNextLatestMessage.data.success, true);
			assert.strictEqual(
				theNextLatestMessage.data.message,
				`Client "${clientId}" unsubscribed from channel "markets"`
			);
			// Get the server to publish a message to the channel

			// a second client needs to be subscribed, and localstorage scrubbed to prevent duplicate client id assignment;
			global.localStorage.removeItem('sarus-client-id');
			const otherHubClient = new HubClient(config);
			await delayUntil(() => otherHubClient.sarus.ws.readyState === 1);
			await delayUntil(() => {
				return (
					// eslint-disable-next-line no-undef
					window.localStorage.getItem('sarus-client-id') !== undefined
				);
			});
			await otherHubClient.subscribe('markets');

			await hub.pubsub.publish({
				data: {
					channel: 'markets',
					message: 'FTSE: 5845 (-5)',
				},
			});
			await delay(25);

			// Check that the client does not receive the message
			const theFinalLatestMessage = messages[messages.length - 1];
			assert.notStrictEqual(theFinalLatestMessage.action, 'message');
			hubClient.sarus.disconnect();
			otherHubClient.sarus.disconnect();
		});

		it('should return an error response if the websocket client id is not present', async () => {
			const messages = [];
			const client = new WebSocket('ws://localhost:5000');
			client.on('message', (event) => {
				const message = JSON.parse(event);
				messages.push(message);
			});

			const unsubscribeRequest = {
				id: uuidv4(),
				action: 'unsubscribe',
				type: 'request',
				data: {
					channel: 'sport',
				},
			};
			await delayUntil(() => client.readyState === 1);
			client.send(JSON.stringify(unsubscribeRequest));
			await delay(50);
			const latestMessage = messages[messages.length - 1];
			assert.strictEqual(latestMessage.type, 'error');
			assert.strictEqual(
				latestMessage.error,
				'No client id was found on the WebSocket'
			);
			client.close();
		});
		it('should return an error response if the channel is missing', async () => {
			const messages = [];
			const hubClient = new HubClient({ url: 'ws://localhost:5000' });
			hubClient.sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delayUntil(() => hubClient.sarus.ws.readyState === 1);
			await delayUntil(() => {
				return (
					// eslint-disable-next-line no-undef
					window.localStorage.getItem('sarus-client-id') !== undefined
				);
			});
			// Subscribe the client to the channel
			await hubClient.subscribe('markets');
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.data.success, true);
			assert.strictEqual(
				latestMessage.data.message,
				`Client "${clientId}" subscribed to channel "markets"`
			);
			// Unsubscribe the client from the channel
			await hubClient.unsubscribe(null);
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(theNextLatestMessage.type, 'error');
			assert.strictEqual(
				theNextLatestMessage.error,
				'No channel was passed in the data'
			);
			hubClient.sarus.disconnect();
		});
	});

	describe('dataStore types', () => {
		it('should use the memory data store by default', () => {
			assert(hub.pubsub.dataStore instanceof MemoryDataStore);
		});

		describe('when passed a dataStoreType parameter', () => {
			describe('when the dataStore type exists', () => {
				it('should create an instance of that dataStore type and bind it to the class', async () => {
					const redisHub = new Hub({
						port: 6000,
						dataStoreType: 'redis',
					});
					assert(redisHub.pubsub.dataStore instanceof RedisDataStore);
					await redisHub.pubsub.dataStore.internalRedis.quitAsync();
					await redisHub.pubsub.dataStore.redis.quitAsync();
				});
			});

			describe('when the dataStore type does not exist', () => {
				it('should throw an error', async () => {
					assert.throws(
						() => {
							new Hub({ port: 6000, dataStoreType: 'postgres' });
						},
						{
							message:
								'dataStoreType "postgres" is not a valid option',
						}
					);
				});
			});
		});
	});

	describe('#unsubscribeClientFromAllChannels', () => {
		it('should unsubscribe the client from all of its channels', async () => {
			const newHub = await new Hub({ port: 5004 });
			newHub.listen();
			const hubClient = new HubClient({ url: 'ws://localhost:5004' });
			await delayUntil(() => hubClient.sarus.ws.readyState === 1);
			await delayUntil(() => {
				return hubClient.getClientId();
			});
			await hubClient.subscribe('shares');
			await newHub.pubsub.unsubscribeClientFromAllChannels({
				ws: { clientId: hubClient.getClientId() },
			});
			const channels = await newHub.pubsub.dataStore.getChannelsForClientId(
				hubClient.getClientId()
			);
			const clientIds = await newHub.pubsub.dataStore.getClientIdsForChannel(
				'shares'
			);
			assert.deepStrictEqual(channels, []);
			assert.deepStrictEqual(clientIds, []);
			hubClient.sarus.disconnect();
			newHub.server.close();
		});
	});

	describe('#addChannelConfiguration', () => {
		describe('when passed an authenticate option', () => {
			it('should add a channel with an authenticate function to call during subscription requests', async () => {
				const channel = 'dogs';
				let called = false;
				const authenticate = ({ data, socket }) => {
					assert.strictEqual(data.password, 'food');
					assert.strictEqual(socket.clientId, 'woof');
					called = true;
					return called;
				};
				hub.pubsub.addChannelConfiguration({ channel, authenticate });
				assert.deepStrictEqual(
					hub.pubsub.channelConfigurations.dogs.authenticate,
					authenticate
				);
				const data = {
					channel,
					password: 'food',
				};
				const socket = {
					clientId: 'woof',
				};
				await hub.pubsub.subscribe({ data, socket });
				assert(called);
				const channels = await hub.pubsub.dataStore.getChannelsForClientId(
					socket.clientId
				);
				assert(channels.indexOf('dogs') !== -1);
			});
		});
	});

	describe('#removeChannelConfiguration', () => {

		it('should remove the channel configuration', () => {
			const channel = 'dogs';
			assert(hub.pubsub.channelConfigurations[channel]);
			hub.pubsub.removeChannelConfiguration(channel);
			assert(!hub.pubsub.channelConfigurations[channel]);
		});

	});
});
