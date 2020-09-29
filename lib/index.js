const http = require('http');
const WebSocket = require('ws');
const { requestClientId } = require('./clientIdentification');
const { parseMessage } = require('./messageParsing');
const PubSub = require('./pubsub');
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
		this.pubsub = new PubSub({ wss: this.wss });

		// The connection event listeners get bound on the websocket connection
		// that gets opened in the connection event on the server.
		this.connectionEventListeners = auditConnectionEventListeners(
			connectionEventListeners
		) || {
			message: [parseMessage(this.pubsub)],
			close: [],
			error: [],
		};

		// The server event listeners get bound on the websocket server.
		this.serverEventListeners = auditServerEventListeners(
			serverEventListeners
		) || {
			connection: [this.attachConnectionEventListeners],
			error: [],
			listening: [],
			headers: [],
			close: [],
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
		return this.server;
	}
}

module.exports = Hub;
