// Dependencies
const assert = require('assert');
const http = require('http');
const RPC = require('../../lib/rpc');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

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
					data: {
						error: 'No server action found',
					},
				});
			});
		});
	});

	describe('making a request from server to client', () => {
		describe('when an action is found', () => {
			it.todo(
				'should execute the action and return a response to the server'
			);
		});

		describe('when an action is not found', () => {
			it.todo(
				'should return an error response if no corresponding action was found'
			);
		});
	});
});
