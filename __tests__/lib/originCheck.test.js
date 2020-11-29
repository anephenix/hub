// Dependencies
const assert = require('assert');
const { Hub, HubClient } = require('../../index');
const { delay } = require('../../helpers/delay');
const httpShutdown = require('http-shutdown');

describe('Origin checking', () => {

	describe('when allowedOrigins is an empty array', () => {

		it('should not close the connection to block the client', async () => {
			const hub = new Hub({ port: 6000 });
			const server = httpShutdown(hub.server);
			server.listen(6000);
			const hubClient = new HubClient({ url: 'ws://localhost:6000' });
			await hubClient.isReady();
			await delay(100);
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			await server.shutdown();
		});
	});

	describe('when origin checking is enabled', () => {
		it('should disconnect any clients that attempt to connect from an origin that is not in the allowed origins list', async () => {
			const hub = new Hub({ port: 7000, allowedOrigins: ['localhost:4000'] });
			const server = httpShutdown(hub.server);
			server.listen(7000);
			const hubClient = new HubClient({ url: 'ws://localhost:7000' });
			await delay(100);
			assert.strictEqual(Array.from(hub.wss.clients).length, 0);
			assert.strictEqual(hubClient.sarus.ws.readyState, 3);
			await server.shutdown();
		});

		it('should only allow clients to connect if they have an allowed origin', async () => {
			const hub = new Hub({ port: 8000, allowedOrigins: ['localhost:8000'] });
			const server = httpShutdown(hub.server);
			server.listen(8000);
			const hubClient = new HubClient({ url: 'ws://localhost:8000' });
			await delay(100);
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			assert.strictEqual(hubClient.sarus.ws.readyState, 1);
			await server.shutdown();
		});
	});

});