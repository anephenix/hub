// Dependencies
const assert = require('assert');
const { Hub, HubClient } = require('../../index');
const { delay } = require('../../helpers/delay');
const httpShutdown = require('http-shutdown');

describe('IP Address checking', () => {
	describe('when allowedIPAddresses is an empty array', () => {
		it('should not close the connection to block the client', async () => {
			const hub = new Hub({ port: 6001 });
			const server = httpShutdown(hub.server);
			server.listen(6001);
			const hubClient = new HubClient({ url: 'ws://localhost:6001' });
			await hubClient.isReady();
			await delay(100);
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			await server.shutdown();
		});
	});

	describe('when ip address checking is enabled', () => {
		it('should disconnect any clients that attempt to connect from an ip address that is not in the allowed ip addresses list', async () => {
			const hub = new Hub({
				port: 7001,
				allowedIpAddresses: ['151.101.0.81'],
			});
			const server = httpShutdown(hub.server);
			server.listen(7001);
			const hubClient = new HubClient({ url: 'ws://localhost:7001' });
			await delay(100);
			assert.strictEqual(Array.from(hub.wss.clients).length, 0);
			assert.strictEqual(hubClient.sarus.ws.readyState, 3);
			await server.shutdown();
		});

		it('should only allow clients to connect if they have an allowed ip address', async () => {
			const localIpAddress = '::1'; //: '::ffff:127.0.0.1'';
			const hub = new Hub({
				port: 8001,
				allowedIpAddresses: [localIpAddress],
			});
			const server = httpShutdown(hub.server);
			server.listen(8001);
			const hubClient = new HubClient({ url: 'ws://localhost:8001' });
			await delay(100);
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			assert.strictEqual(hubClient.sarus.ws.readyState, 1);
			await server.shutdown();
		});
	});
});
