const assert = require('assert');
const {
	requestClientId,
	processClientId,
	setAndSendClientId,
} = require('../../lib/clientIdentification');
describe('clientIdentification', () => {
	describe('requestClientId', () => {
		it('should send a message from the server to the client, asking for the client id', () => {
			const rawPayload = {
				action: 'request-client-id',
			};
			const expectedPayload = JSON.stringify(rawPayload);
			const ws = {
				send: (payload) => {
					assert.strictEqual(expectedPayload, payload);
				},
			};
			requestClientId(ws);
		});
	});

	describe('processClientId', () => {
		describe('if there is a client id', () => {
			it('should assign the client id to the websocket', () => {
				const ws = {};
				const data = { clientId: 'xx' };
				processClientId({ data, ws });
				assert(ws.clientId === data.clientId);
			});
		});

		describe('if there is not a client id', () => {
			it('should create a client id, and send it to the client', () => {
				let clientId = null;
				const ws = {
					send: (payload) => {
						const parsedPayload = JSON.parse(payload);
						assert.strictEqual(
							parsedPayload.action,
							'set-client-id'
						);
						clientId = parsedPayload.data.clientId;
					},
				};
				const data = {};
				processClientId({ data, ws });
				assert(ws.clientId);
				assert.strictEqual(ws.clientId, clientId);
			});
		});
	});

	describe('setAndSendClientId', () => {
		it('should create a client id, send it to the client, and set it on the websocket connection', () => {
			let clientId = null;
			const ws = {
				send: (payload) => {
					const parsedPayload = JSON.parse(payload);
					assert.strictEqual(parsedPayload.action, 'set-client-id');
					clientId = parsedPayload.data.clientId;
				},
			};
			setAndSendClientId(ws);
			assert(ws.clientId);
			assert.strictEqual(ws.clientId, clientId);
		});
	});
});
