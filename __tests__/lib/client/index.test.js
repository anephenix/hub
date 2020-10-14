// Dependencies
const assert = require('assert');
const { Hub, HubClient } = require('../../../index');
const httpShutdown = require('http-shutdown');
const { delayUntil } = require('../../../helpers/delay');

describe('Client library', () => {
	let hub;
	let shutdownInstance;
	let hubClient;

	beforeAll(async () => {
		hub = new Hub({ port: 5001 });
		shutdownInstance = httpShutdown(hub.listen());
		hubClient = new HubClient({ url: 'ws://localhost:5001' });
		await delayUntil(() => hubClient.sarus.ws.readyState === 1);
		await delayUntil(() => {
			return (
				// eslint-disable-next-line no-undef
				window.localStorage.getItem('sarus-client-id') !== undefined
			);
		});
	});

	afterAll(() => {
		shutdownInstance.shutdown();
	});

	describe('#addChannelMessageHandler', () => {
		it('should add a function to call when a message is received for a channel', async () => {
			await hubClient.subscribe('news');
			let handlerFunctionCalled = false;
			let messageReceived = null;
			const handlerFunction = (message) => {
				messageReceived = message;
				handlerFunctionCalled = true;
			};
			hubClient.addChannelMessageHandler('news', handlerFunction);
			hub.pubsub.publish({
				data: {
					channel: 'news',
					message: {
						title:
							'Sadio Mane: Liverpool forward isolating after positive coronavirus test',
						url: 'http://bbc.co.uk/sport/football/54396525',
					},
				},
			});
			await delayUntil(() => handlerFunctionCalled);
			assert.strictEqual(
				messageReceived.title,
				'Sadio Mane: Liverpool forward isolating after positive coronavirus test'
			);
			assert.strictEqual(
				messageReceived.url,
				'http://bbc.co.uk/sport/football/54396525'
			);
		});
	});

	describe('#removeChannelMessageHandler', () => {
		describe('when passing a function variable', () => {
			it('should remove a function from being called when a message is received for a channel', () => {
				const anotherHandlerFunction = () => {};
				hubClient.addChannelMessageHandler(
					'weather',
					anotherHandlerFunction
				);
				assert.deepStrictEqual(
					hubClient.channelMessageHandlers.weather,
					[anotherHandlerFunction]
				);
				hubClient.removeChannelMessageHandler(
					'weather',
					anotherHandlerFunction
				);
				assert.deepStrictEqual(
					hubClient.channelMessageHandlers.weather,
					[]
				);
			});
		});

		describe('when passing a function name', () => {
			it('should remove a function from being called when a message is received for a channel', () => {
				function yetAnotherHandlerFunction() {}
				hubClient.addChannelMessageHandler(
					'sport',
					yetAnotherHandlerFunction
				);
				assert.deepStrictEqual(hubClient.channelMessageHandlers.sport, [
					yetAnotherHandlerFunction,
				]);
				hubClient.removeChannelMessageHandler(
					'sport',
					'yetAnotherHandlerFunction'
				);
				assert.deepStrictEqual(
					hubClient.channelMessageHandlers.sport,
					[]
				);
			});
		});

		describe('when passing an invalid function variable or name', () => {
			it('should throw an error stating that the function was not found for that channel', () => {
				const anotherHandlerFunction = () => {};
				assert.throws(
					() => {
						hubClient.removeChannelMessageHandler(
							'weather',
							anotherHandlerFunction
						);
					},
					{ message: 'Function not found for channel "weather"' }
				);
				assert.throws(
					() => {
						hubClient.removeChannelMessageHandler(
							'sport',
							'yetAnotherHandlerFunction'
						);
					},
					{ message: 'Function not found for channel "sport"' }
				);
			});
		});
	});

	describe('#listChannelMessageHandlers', () => {
		const anotherHandlerFunction = () => {};
		function yetAnotherHandlerFunction() {}

		beforeAll(() => {
			hubClient.addChannelMessageHandler(
				'weather',
				anotherHandlerFunction
			);
			hubClient.addChannelMessageHandler(
				'sport',
				yetAnotherHandlerFunction
			);
		});

		describe('when a channel is passed', () => {
			it('should list all of the message handlers for a channel', () => {
				const sportChannelMessageHandlers = hubClient.listChannelMessageHandlers(
					'sport'
				);
				assert.deepStrictEqual(sportChannelMessageHandlers, [
					yetAnotherHandlerFunction,
				]);
			});

			describe('when no handlers have ever been set on a channel ever', () => {
				it('should return null', () => {
					const entertainmentChannelMessageHandlers = hubClient.listChannelMessageHandlers(
						'entertainment'
					);
					assert.strictEqual(
						entertainmentChannelMessageHandlers,
						null
					);
				});
			});
		});

		describe('when no channel is passed', () => {
			it('should return all of the message handlers for all channels', () => {
				const channelMessageHandlers = hubClient.listChannelMessageHandlers();
				assert.deepStrictEqual(
					channelMessageHandlers,
					hubClient.channelMessageHandlers
				);
			});
		});
	});

	describe('#subscribe', () => {
		it('should subscribe to a channel', async () => {
			// Subscribe the client to a channel
			const subscribe = await hubClient.subscribe('business');
			assert(subscribe.success);
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			// assert that the hub server has that client noted as a subscriber to that channel
			assert(hub.pubsub.channels.business.indexOf(clientId) !== -1);
		});
	});

	describe('#unsubscribe', () => {
		it('should unsubscribe from a channel', async () => {
			// Subscribe the client to a channel
			const subscribe = await hubClient.subscribe('markets');
			assert(subscribe.success);
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			// assert that the hub server has that client noted as a subscriber to that channel
			assert(hub.pubsub.channels.markets.indexOf(clientId) !== -1);
			const unsubscribe = await hubClient.unsubscribe('markets');
			assert(unsubscribe.success);
			assert(hub.pubsub.channels.markets.indexOf(clientId) === -1);
		});
	});

	describe('#publish', () => {
		it('should publish a message to a channel', async () => {
			await hubClient.subscribe('culture');
			let handlerFunctionCalled = false;
			let messageReceived = null;
			const handlerFunction = (message) => {
				messageReceived = message;
				handlerFunctionCalled = true;
			};
			hubClient.addChannelMessageHandler('culture', handlerFunction);
			await hubClient.publish('culture', { title: 'Dune film delayed' });
			await delayUntil(() => handlerFunctionCalled);
			assert.strictEqual(messageReceived.title, 'Dune film delayed');
		});
		it('should publish a message to a channel, but exclude the sender if they are also a subscribe but wish to not receive the message themselves', async () => {
			await hubClient.subscribe('arts');
			let handlerFunctionCalled = false;
			let messageReceived = null;
			const handlerFunction = (message) => {
				messageReceived = message;
				handlerFunctionCalled = true;
			};
			hubClient.addChannelMessageHandler('arts', handlerFunction);
			await hubClient.publish(
				'arts',
				{
					title: 'Booker prize nominees list revealed',
				},
				true
			);
			assert(!handlerFunctionCalled);
			assert.notDeepStrictEqual(messageReceived, {
				title: 'Booker prize nominees list revealed',
			});
		});
	});
});
