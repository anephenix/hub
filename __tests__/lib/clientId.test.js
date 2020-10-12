const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
const {
	requestClientId,
} = require('../../lib/clientId');
const RPC = require('../../lib/rpc');

describe('clientId', () => {

	let rpc;
	let requestId;
	const messages = [];
	const nonClientMessages = [];
	let ws;
	let nonClientWs;
	let clientId;

	beforeAll(() => {
		rpc = new RPC();
		ws = {
			send: (message) => {
				messages.push(message);
				if (messages.length === 1) {
					const parsedMessage = JSON.parse(message);
					requestId = parsedMessage.id;
					clientId = uuidv4();
					const reply = {
						id: requestId,
						type: 'response',
						action: 'get-client-id',
						data: {
							clientId
						}
					};
					rpc.receive({ message: JSON.stringify(reply), ws });
				}
			}
		};
		nonClientWs = {
			send: (message) => {
				nonClientMessages.push(message);
				const parsedMessage = JSON.parse(message);
				if (parsedMessage.action === 'get-client-id') {
					requestId = parsedMessage.id;
					const reply = {
						id: requestId,
						type: 'response',
						action: 'get-client-id',
						data: {}
					};
					rpc.receive({ message: JSON.stringify(reply), ws });
				} else {
					// set-client-id
					requestId = parsedMessage.id;
					const reply = {
						id: requestId,
						type: 'response',
						action: 'set-client-id',
						data: { success: true}
					};
					rpc.receive({ message: JSON.stringify(reply), ws: nonClientWs });
				}
			}
		};
	});


	describe('requestClientId', () => {

		beforeAll(async () => {
			await requestClientId({ ws, rpc });
		});

		it('should send a message from the server to the client, asking for the client id', async () => {
			const lastMessage = messages[messages.length - 1];
			const parsedMessage = JSON.parse(lastMessage);
			assert.strictEqual(parsedMessage.action, 'get-client-id');
			assert.strictEqual(parsedMessage.type, 'request');
			assert.strictEqual(parsedMessage.id, requestId);
		});

		describe('if the client replies with a client id', () => {
			it('should assign the client id to the websocket', () => {
				assert.strictEqual(ws.clientId, clientId);
			});
		});

		describe('if the client replies with no client id', () => {
			it('should create a client id, assign it to the websocket, and send it to the client', async () => {
				await requestClientId({ ws: nonClientWs, rpc });
				const newClientId = nonClientWs.clientId;
				assert(newClientId);
				const lastMessage = nonClientMessages[nonClientMessages.length - 1];
				const parsedMessage = JSON.parse(lastMessage);
				assert.strictEqual(parsedMessage.action, 'set-client-id');
				assert.strictEqual(parsedMessage.data.clientId, newClientId);
			});
		});
	});
});
