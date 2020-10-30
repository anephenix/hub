// Dependencies
const assert = require('assert');
const http = require('http');
const RPC = require('../../lib/rpc');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { Hub, HubClient } = require('../../index');
const { delayUntil } = require('../../helpers/delay');
const httpShutdown = require('http-shutdown');

describe('rpc', () => {
	let server;
	let wss;
	let rpc;
	let helloFunc;

	beforeAll(() => {
		server = http.createServer();
		wss = new WebSocket.Server({ server });
		rpc = new RPC({ wss });
	});

	describe('adding an action function', () => {
		it('should add a function for an action name', () => {
			helloFunc = ({ data, reply }) => {
				reply({ data });
			};
			rpc.add('hello', helloFunc);
			assert.deepStrictEqual(rpc.list('hello'), [helloFunc]);
		});
	});

	describe('listing actions and their functions', () => {
		it('should list all of the actions and functions that are defined', () => {
			assert.deepStrictEqual(rpc.list(), { hello: [helloFunc] });
		});

		it('should list all of the functions for an action, if an action name is passed', () => {
			assert.deepStrictEqual(rpc.list('hello'), [helloFunc]);
		});
	});

	describe('removing an action function', () => {
		it('should remove a function for an action name', () => {
			const firstFunc = () => {};
			const secondFunc = ({ data, reply }) => {
				reply({ data });
			};
			rpc.add('world', firstFunc);
			rpc.add('world', secondFunc);
			rpc.remove('world', firstFunc);
			assert.deepStrictEqual(rpc.list('world'), [secondFunc]);
		});
	});

	describe('making a request from client to server', () => {
		describe('when an action is found', () => {
			it('should execute the action and return a response to the client', () => {
				let responsePayload;

				const searchFunc = ({ id, data, reply }) => {
					const entries = [
						'cat',
						'dog',
						'fish',
						'parrot',
						'cockatoo',
						'hamster',
						'mouse',
						'snake',
						'spider',
						'lizard',
					];
					const results = entries.filter((x) =>
						x.includes(data.term)
					);
					reply({
						id,
						action: 'search',
						type: 'response',
						data: { results },
					});
				};
				rpc.add('search', searchFunc);

				const id = uuidv4();

				const requestPayload = JSON.stringify({
					id,
					action: 'search',
					type: 'request',
					data: {
						term: 'cat',
					},
				});

				const ws = {
					send: (payload) => {
						responsePayload = payload;
					},
				};

				rpc.receive({ message: requestPayload, ws });

				assert.deepStrictEqual(JSON.parse(responsePayload), {
					id,
					action: 'search',
					type: 'response',
					data: {
						results: ['cat'],
					},
				});
			});
		});

		describe('when an action is not found', () => {
			it('should return an error response if no corresponding action was found', () => {
				let responsePayload;

				const id = uuidv4();
				const requestPayload = JSON.stringify({
					id,
					action: 'find',
					type: 'request',
					data: {
						term: 'cat',
					},
				});

				const ws = {
					send: (payload) => {
						responsePayload = payload;
					},
				};

				rpc.receive({ message: requestPayload, ws });
				assert.deepStrictEqual(JSON.parse(responsePayload), {
					id,
					action: 'find',
					type: 'error',
					error: 'No server action found',
				});
			});
		});
	});

	describe('making a request from server to client', () => {
		describe('when an action is found', () => {
			it('should execute the action and return a response to the server', async () => {
				const hubServer = new Hub({ port: 4001 });
				const shutSignal = httpShutdown(hubServer.listen());
				const hubClient = new HubClient({ url: 'ws://localhost:4001' });
				hubClient.rpc.add('get-environment', ({ reply }) => {
					const { arch, platform, version } = process;
					reply({ data: { arch, platform, version } });
				});

				await hubClient.isReady();

				const ws = hubServer.wss.clients.values().next().value;
				const response = await hubServer.rpc.send({
					ws,
					action: 'get-environment',
				});
				assert.strictEqual(response.arch, process.arch);
				assert.strictEqual(response.platform, process.platform);
				assert.strictEqual(response.version, process.version);
				shutSignal.shutdown();
			});
		});

		describe('when an action is not found', () => {
			it('should return an error response if no corresponding action was found', async () => {
				const hubServer = new Hub({ port: 4002 });
				const shutSignal = httpShutdown(hubServer.listen());
				const hubClient = new HubClient({ url: 'ws://localhost:4002' });
				await hubClient.isReady();
				const ws = hubServer.wss.clients.values().next().value;
				try {
					await hubServer.rpc.send({
						ws,
						action: 'get-environment',
					});
					assert(false, 'Should not execute this line');
				} catch (err) {
					assert.strictEqual(err, 'No client action found');
				}
				shutSignal.shutdown();
			});
		});
	});

	describe('making a request without wanting a reply', () => {
		it('should make a request but not receive a reply', async () => {
			const hubServer = new Hub({ port: 4002 });
			const shutSignal = httpShutdown(hubServer.listen());
			const hubClient = new HubClient({ url: 'ws://localhost:4002' });
			hubClient.rpc.add('set-api-key', ({ data, reply }) => {
				assert.strictEqual(data.apiKey, 'xxx');
				reply({ data: { success: true, message: 'api key set' } });
			});
			await hubClient.isReady();
			const ws = hubServer.wss.clients.values().next().value;
			const response = await hubServer.rpc.send({
				ws,
				action: 'set-api-key',
				data: { apiKey: 'xxx' },
				noReply: true,
			});
			assert.strictEqual(response, null);
			await delayUntil(() => hubServer.rpc.requests.length === 0);
			assert.strictEqual(hubServer.rpc.requests.length, 0);
			assert.strictEqual(hubServer.rpc.responses.length, 0);
			shutSignal.shutdown();
		});
	});
});
