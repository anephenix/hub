const http = require('http');
const WebSocket = require('ws');
const { requestClientId } = require('./clientIdentification');
const { parseMessage } = require('./messageParsing');
const {
	auditServerEventListeners,
	auditConnectionEventListeners,
} = require('./validators');

class Hub {
	constructor({ port, serverEventListeners, connectionEventListeners }) {
		this.port = port;
		this.server = http.createServer();
		this.wss = new WebSocket.Server({ server: this.server });
		this.attachConnectionEventListeners = this.attachConnectionEventListeners.bind(
			this
		);
		this.serverEventListeners = auditServerEventListeners(
			serverEventListeners
		) || {
			// These are examples for the moment, none of them are needed for rpc or pubsub
			connection: [
				() => {
					// console.log('Connection opened');
				},
				this.attachConnectionEventListeners,
			],
			error: [
				// (event) => {
				// 	console.log('Error occurred');
				// 	console.log(event);
				// },
			],
			listening: [
				// (event) => {
				// 	console.log('Listening');
				// 	console.log(event);
				// },
			],
			headers: [
				// (event) => {
				// 	console.log('Headers');
				// 	console.log(event);
				// },
			],
			close: [], // NOTE - not sure if this ever gets triggered
		};

		// The connection event listeners get bound on the websocket connection
		// that gets opened in the connection event on the server.
		this.connectionEventListeners = auditConnectionEventListeners(
			connectionEventListeners
		) || {
			message: [parseMessage],
			close: [
				// (x) => {
				// 	console.log('Connection closed');
				// 	console.log(x);
				// },
			],
			error: [
				// (x) => {
				// 	console.log('Error occurred');
				// 	console.log(x);
				// },
			],
		};
		this.attachBindings();
	}

	attachConnectionEventListeners(ws) {
		const { connectionEventListeners } = this;
		ws.on('message', (message) => {
			connectionEventListeners.message.forEach((func) =>
				func({ message, ws })
			);
		});

		ws.on('close', (event) => {
			connectionEventListeners.close.forEach((func) =>
				func({ event, ws })
			);
		});

		ws.on('error', (error) => {
			connectionEventListeners.error.forEach((func) =>
				func({ error, ws })
			);
		});

		requestClientId(ws);
	}

	attachBindings() {
		this.wss.on('connection', (ws) => {
			this.serverEventListeners.connection.forEach((func) => func(ws));
		});

		this.wss.on('close', (event) => {
			this.serverEventListeners.close.forEach((func) => func(event));
		});

		this.wss.on('error', (event) => {
			this.serverEventListeners.error.forEach((func) => func(event));
		});

		this.wss.on('listening', (event) => {
			this.serverEventListeners.listening.forEach((func) => func(event));
		});

		this.wss.on('headers', (event) => {
			this.serverEventListeners.headers.forEach((func) => func(event));
		});
	}

	listen() {
		this.server.listen(this.port);
	}
}

module.exports = Hub;
