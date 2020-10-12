// Dependencies
const assert = require('assert');
const http = require('http');
const RPC = require('../../lib/rpc');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { Hub, HubClient } = require('../../index');
const { encode } = require('../../lib/dataTransformer');
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
			helloFunc = ({ data, ws }) => {
				ws.send(data);
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
			const secondFunc = ({ data, ws }) => {
				ws.send(data);
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

				const searchFunc = ({ id, data, ws }) => {
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
					ws.send({
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

				assert.deepStrictEqual(responsePayload, {
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
				const sarusConfig = { url: 'ws://localhost:4001' };
				const hubClient = new HubClient({ sarusConfig });
				hubClient.rpc.add(
					'get-environment',
					({ id, type, action, sarus }) => {
						const { arch, platform, version } = process;
						if (type === 'request') {
							const payload = {
								id,
								action,
								type: 'response',
								data: { arch, platform, version },
							};
							sarus.send(encode(payload));
						}
					}
				);

				await delayUntil(() => {
					return hubClient.sarus.ws.readyState === 1;
				}, 5000);

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
				const sarusConfig = { url: 'ws://localhost:4002' };
				const hubClient = new HubClient({ sarusConfig });
				await delayUntil(() => {
					return hubClient.sarus.ws.readyState === 1;
				}, 5000);

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
});