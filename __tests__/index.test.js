const assert = require('assert');
const Hub = require('../index');
const httpShutdown = require('http-shutdown');
const WebSocket = require('ws');

const delay = (duration) =>
	new Promise((resolve) => setTimeout(resolve, duration));

describe('Hub', () => {
	Hub;

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
				await delay(25);
				const client = new WebSocket('ws://localhost:4000');
				client.onopen = () => {
					connected = true;
				};
				await delay(25);
				assert(client.readyState === 1);
				assert(connected);
				client.close();
			});

			it('should attach the connection event listeners', async () => {
				let connected = false;
				const messages = [];
				await delay(25);
				const client = new WebSocket('ws://localhost:4000');
				client.onopen = () => {
					connected = true;
				};
				client.onmessage = (event) => {
					messages.push(JSON.parse(event.data));
				};
				await delay(25);
				assert(client.readyState === 1);
				assert(connected);
				const latestMessage = messages[messages.length - 1];
				assert(latestMessage.action === 'request-client-id');
				client.send(
					JSON.stringify({
						action: 'reply-client-id',
						data: { clientId: null },
					})
				);
				client.close();
			});
		});
	});
});
