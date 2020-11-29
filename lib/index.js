/*
	Main Library
	------------

	This is the JavaScript class where the library's parts come together.
*/

// Dependencies
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const { requestClientId, checkHasClientId } = require('./clientId');
const PubSub = require('./pubsub');
const RPC = require('./rpc');
const { handleOriginCheck } = require('./originCheck');
const {
	auditServerEventListeners,
	auditConnectionEventListeners,
} = require('./validators');

class Hub {
	constructor({
		port,
		server = 'http',
		serverOptions = null,
		serverEventListeners,
		connectionEventListeners,
		dataStoreType,
		dataStoreOptions = {},
		allowedOrigins
	}) {
		this.port = port;
		this.setServer(server, serverOptions); 
		this.wss = new WebSocket.Server({ server: this.server });
		this.attachConnectionEventListeners = this.attachConnectionEventListeners.bind(
			this
		);
		this.allowedOrigins = allowedOrigins || [];
		this.rpc = new RPC();
		this.pubsub = new PubSub({
			wss: this.wss,
			rpc: this.rpc,
			dataStoreType,
			dataStoreOptions,
		});

		// The connection event listeners get bound on the websocket connection
		// that gets opened in the connection event on the server.
		this.connectionEventListeners = auditConnectionEventListeners(
			connectionEventListeners
		) || this.loadDefaultConnectionEventListeners();

		// The server event listeners get bound on the websocket server.
		this.serverEventListeners = auditServerEventListeners(
			serverEventListeners
		) || this.loadDefaultServerEventListeners();

		this.attachBindings();
	}

	loadDefaultConnectionEventListeners() {
		return {
			message: [this.rpc.receive],
			close: [this.pubsub.unsubscribeClientFromAllChannels],
			error: [],
		};		
	}

	loadDefaultServerEventListeners() {
		return {
			connection: [handleOriginCheck(this.allowedOrigins, this.attachConnectionEventListeners) ],
			error: [],
			listening: [],
			headers: [],
			close: [],
		};
	}

	setServer(server, serverOptions) {
		if (server instanceof http.Server) {
			this.protocol = 'ws';
			return this.server = server;
		}
		if (server instanceof https.Server) {
			this.protocol = 'wss';
			return this.server = server;
		}
		if (server === 'http') {
			this.protocol = 'ws';
			return this.server = http.createServer(serverOptions);
		}
		if (server === 'https') {
			this.protocol = 'wss';
			return this.server = https.createServer(serverOptions);
		}
		throw new Error('Invalid option passed for server');
	}

	async attachConnectionEventListeners(ws) {
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

		// This asks the WebSocket client if it has a client id
		await requestClientId({ ws, rpc: this.rpc });

	}

	attachBindings() {
		this.rpc.add('has-client-id', checkHasClientId);

		this.wss.on('connection', (ws, req) => {
			this.serverEventListeners.connection.forEach((func) => func(ws, req));
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
