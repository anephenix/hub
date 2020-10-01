const assert = require('assert');
const httpShutdown = require('http-shutdown');
const Hub = require('../../index');
const WebSocket = require('ws');
const Sarus = require('@anephenix/sarus');
const enableHubSupport = require('../../features/support/client/hub-client');
const delay = require('../../helpers/delay');

describe('pubsub', () => {
	let hub;
	let server;

	beforeAll(async () => {
		hub = new Hub({ port: 5000 });
		server = await httpShutdown(hub.server.listen(5000));
	});

	afterAll(async () => {
		await server.shutdown();
	});

	describe('#subscribe', () => {
		describe('when passed a clientId and a channel', () => {
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
		it('should allow the client to publish a message to all of the channel subscribers, including themselves', async () => {
			const messages = [];
			const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
			enableHubSupport(sarus);
			sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delay(150);
			assert(sarus.ws.readyState === 1);

			const subscribeRequest = {
				action: 'subscribe',
				data: {
					channel: 'politics',
				},
			};
			// Subscribe the client to the channel
			sarus.send(JSON.stringify(subscribeRequest));
			await delay(25);
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.success, true);
			assert.strictEqual(
				latestMessage.message,
				`Client "${clientId}" subscribed to channel "politics"`
			);

			// Get the client to publish a message to the channel
			const publishMessage = {
				action: 'publish',
				data: {
					channel: 'politics',
					message: 'Elections held',
				},
			};
			sarus.send(JSON.stringify(publishMessage));
			await delay(25);
			// Check that the client receives the message
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(theNextLatestMessage.action, 'message');
			assert.strictEqual(theNextLatestMessage.data.channel, 'politics');
			assert.strictEqual(
				theNextLatestMessage.data.message,
				'Elections held'
			);
		});

		it('should allow the client to publish a message to all of the channel subscribers, excluding themselves', async () => {
			const messages = [];
			const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
			enableHubSupport(sarus);
			sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delay(100);
			assert(sarus.ws.readyState === 1);

			const subscribeRequest = {
				action: 'subscribe',
				data: {
					channel: 'showbiz',
				},
			};
			// Subscribe the client to the channel
			sarus.send(JSON.stringify(subscribeRequest));
			await delay(25);
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.success, true);
			assert.strictEqual(
				latestMessage.message,
				`Client "${clientId}" subscribed to channel "showbiz"`
			);

			// Get the client to publish a message to the channel
			const publishMessage = {
				action: 'publish',
				data: {
					channel: 'showbiz',
					message: 'Oscars ceremony to be virtual',
					excludeSender: true,
				},
			};
			sarus.send(JSON.stringify(publishMessage));
			await delay(25);
			// Check that the client receives the message
			const theNextLatestMessage = messages[messages.length - 1];
			assert.notStrictEqual(theNextLatestMessage.action, 'message');
			assert.strictEqual(theNextLatestMessage.data, undefined);
		});

		it('should allow the server to publish a message to all of the channel subscribers', async () => {
			const messages = [];
			const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
			enableHubSupport(sarus);
			sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delay(100);
			assert(sarus.ws.readyState === 1);

			const subscribeRequest = {
				action: 'subscribe',
				data: {
					channel: 'markets',
				},
			};
			// Subscribe the client to the channel
			sarus.send(JSON.stringify(subscribeRequest));
			await delay(25);
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.success, true);
			assert.strictEqual(
				latestMessage.message,
				`Client "${clientId}" subscribed to channel "markets"`
			);

			// Get the server to publish a message to the channel
			hub.pubsub.publish({
				data: {
					channel: 'markets',
					message: 'FTSE: 5845 (-5)',
				},
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
					action: 'publish',
					data: {
						channel: 'sport',
						message: 'Something is happening',
					},
				};

				await delay(25);
				client.send(JSON.stringify(publishRequest));
				await delay(50);
				const latestMessage = messages[messages.length - 1];
				assert.strictEqual(latestMessage.success, false);
				assert.strictEqual(
					latestMessage.message,
					'No client id was found on the WebSocket'
				);
			});
			it('should return an error response if the channel is missing', async () => {
				const messages = [];
				const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
				enableHubSupport(sarus);
				sarus.on('message', (event) => {
					const message = JSON.parse(event.data);
					messages.push(message);
				});
				await delay(100);
				assert(sarus.ws.readyState === 1);

				const subscribeRequest = {
					action: 'subscribe',
					data: {
						channel: 'showbiz',
					},
				};
				// Subscribe the client to the channel
				sarus.send(JSON.stringify(subscribeRequest));
				await delay(25);
				// Acknowledge the channel subscription
				// eslint-disable-next-line no-undef
				const clientId = window.localStorage.getItem('sarus-client-id');
				const latestMessage = messages[messages.length - 1];
				if (!latestMessage) throw new Error('No messages intercepted');
				assert.strictEqual(latestMessage.success, true);
				assert.strictEqual(
					latestMessage.message,
					`Client "${clientId}" subscribed to channel "showbiz"`
				);

				// Get the client to publish a message to the channel
				const publishMessage = {
					action: 'publish',
					data: {
						message: 'Oscars ceremony to be virtual',
					},
				};
				sarus.send(JSON.stringify(publishMessage));
				await delay(25);
				// Check that the client receives the message
				const theNextLatestMessage = messages[messages.length - 1];
				assert.strictEqual(theNextLatestMessage.success, false);
				assert.strictEqual(
					theNextLatestMessage.message,
					'No channel was passed in the data'
				);
			});
			it('should return an error response if the message is missing', async () => {
				const messages = [];
				const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
				enableHubSupport(sarus);
				sarus.on('message', (event) => {
					const message = JSON.parse(event.data);
					messages.push(message);
				});
				await delay(100);
				assert(sarus.ws.readyState === 1);

				const subscribeRequest = {
					action: 'subscribe',
					data: {
						channel: 'showbiz',
					},
				};
				// Subscribe the client to the channel
				sarus.send(JSON.stringify(subscribeRequest));
				await delay(25);
				// Acknowledge the channel subscription
				// eslint-disable-next-line no-undef
				const clientId = window.localStorage.getItem('sarus-client-id');
				const latestMessage = messages[messages.length - 1];
				if (!latestMessage) throw new Error('No messages intercepted');
				assert.strictEqual(latestMessage.success, true);
				assert.strictEqual(
					latestMessage.message,
					`Client "${clientId}" subscribed to channel "showbiz"`
				);

				// Get the client to publish a message to the channel
				const publishMessage = {
					action: 'publish',
					data: {
						channel: 'showbiz',
					},
				};
				sarus.send(JSON.stringify(publishMessage));
				await delay(25);
				// Check that the client receives the message
				const theNextLatestMessage = messages[messages.length - 1];
				assert.strictEqual(theNextLatestMessage.success, false);
				assert.strictEqual(
					theNextLatestMessage.message,
					'No message was passed in the data'
				);
			});
		});

		describe('when publishing from a server', () => {
			it('should return an error response if the channel is missing', async () => {
				const response = hub.pubsub.publish({
					data: {
						message: 'FTSE: 5845 (-5)',
					},
				});
				assert.strictEqual(response.success, false);
				assert.strictEqual(
					response.message,
					'No channel was passed in the data'
				);
			});
			it('should return an error response if the message is missing', async () => {
				const response = hub.pubsub.publish({
					data: {
						channel: 'markets',
					},
				});
				assert.strictEqual(response.success, false);
				assert.strictEqual(
					response.message,
					'No message was passed in the data'
				);
			});
		});
	});

	describe('#unsubscribe', () => {
		it('should remove a client from a channel, and ensure that the client no longer receives messages for that channel', async () => {
			const messages = [];
			const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
			enableHubSupport(sarus);
			sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delay(100);
			assert(sarus.ws.readyState === 1);

			const subscribeRequest = {
				action: 'subscribe',
				data: {
					channel: 'markets',
				},
			};
			// Subscribe the client to the channel
			sarus.send(JSON.stringify(subscribeRequest));
			await delay(25);
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.success, true);
			assert.strictEqual(
				latestMessage.message,
				`Client "${clientId}" subscribed to channel "markets"`
			);

			await delay(25);
			const unsubscribeRequest = {
				action: 'unsubscribe',
				data: {
					channel: 'markets',
				},
			};
			// Subscribe the client to the channel
			sarus.send(JSON.stringify(unsubscribeRequest));
			await delay(25);
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(theNextLatestMessage.success, true);
			assert.strictEqual(
				theNextLatestMessage.message,
				`Client "${clientId}" unsubscribed from channel "markets"`
			);
			// Get the server to publish a message to the channel
			hub.pubsub.publish({
				data: {
					channel: 'markets',
					message: 'FTSE: 5845 (-5)',
				},
			});
			await delay(25);

			// Check that the client does not receive the message
			const theFinalLatestMessage = messages[messages.length - 1];
			assert.notStrictEqual(theFinalLatestMessage.action, 'message');
			assert.strictEqual(theFinalLatestMessage.data, undefined);
		});

		it('should return an error response if the websocket client id is not present', async () => {
			const messages = [];
			const client = new WebSocket('ws://localhost:5000');
			client.on('message', (event) => {
				const message = JSON.parse(event);
				messages.push(message);
			});

			const publishRequest = {
				action: 'unsubscribe',
				data: {
					channel: 'sport',
				},
			};

			await delay(25);
			client.send(JSON.stringify(publishRequest));
			await delay(50);
			const latestMessage = messages[messages.length - 1];
			assert.strictEqual(latestMessage.success, false);
			assert.strictEqual(
				latestMessage.message,
				'No client id was found on the WebSocket'
			);
		});
		it('should return an error response if the channel is missing', async () => {
			const messages = [];
			const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
			enableHubSupport(sarus);
			sarus.on('message', (event) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});
			await delay(100);
			assert(sarus.ws.readyState === 1);

			const subscribeRequest = {
				action: 'subscribe',
				data: {
					channel: 'markets',
				},
			};
			// Subscribe the client to the channel
			sarus.send(JSON.stringify(subscribeRequest));
			await delay(25);
			// Acknowledge the channel subscription
			// eslint-disable-next-line no-undef
			const clientId = window.localStorage.getItem('sarus-client-id');
			const latestMessage = messages[messages.length - 1];
			if (!latestMessage) throw new Error('No messages intercepted');
			assert.strictEqual(latestMessage.success, true);
			assert.strictEqual(
				latestMessage.message,
				`Client "${clientId}" subscribed to channel "markets"`
			);

			await delay(25);
			const unsubscribeRequest = {
				action: 'unsubscribe',
				data: {},
			};
			// Unsubscribe the client from the channel
			sarus.send(JSON.stringify(unsubscribeRequest));
			await delay(25);
			const theNextLatestMessage = messages[messages.length - 1];
			assert.strictEqual(theNextLatestMessage.success, false);
			assert.strictEqual(
				theNextLatestMessage.message,
				'No channel was passed in the data'
			);
		});
	});
});
