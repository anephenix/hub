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
const dataStores = require('./dataStores');
const PubSub = require('./pubsub');
const RPC = require('./rpc');
const Security = require('./security');
const { handleOriginCheck } = require('./originCheck');
const { handleIpAddressCheck } = require('./ipCheck');
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
		allowedOrigins,
		allowedIpAddresses,
	}) {
		this.port = port;
		this.setServer(server, serverOptions);
		this.wss = new WebSocket.Server({ server: this.server });
		this.attachConnectionEventListeners = this.attachConnectionEventListeners.bind(
			this
		);
		this.allowedOrigins = allowedOrigins || [];
		this.allowedIpAddresses = allowedIpAddresses || [];
		this.rpc = new RPC();

		const DataStore = dataStores[dataStoreType || 'memory'];
		if (!DataStore)
			throw new Error(
				`dataStoreType "${dataStoreType}" is not a valid option`
			);
		this.dataStore = new DataStore(dataStoreOptions);

		this.pubsub = new PubSub({
			wss: this.wss,
			rpc: this.rpc,
			dataStore: this.dataStore,
		});

		this.security = new Security({ dataStore: this.dataStore });

		// The connection event listeners get bound on the websocket connection
		// that gets opened in the connection event on the server.
		this.connectionEventListeners =
			auditConnectionEventListeners(connectionEventListeners) ||
			this.loadDefaultConnectionEventListeners();

		// The server event listeners get bound on the websocket server.
		this.serverEventListeners =
			auditServerEventListeners(serverEventListeners) ||
			this.loadDefaultServerEventListeners();

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
			connection: [
				handleOriginCheck(
					this.allowedOrigins,
					handleIpAddressCheck(
						this.allowedIpAddresses,
						this.attachConnectionEventListeners
					)
				),
			],
			error: [],
			listening: [],
			headers: [],
			close: [],
		};
	}

	setServer(server, serverOptions) {
		if (server instanceof http.Server) {
			this.protocol = 'ws';
			return (this.server = server);
		}
		if (server instanceof https.Server) {
			this.protocol = 'wss';
			return (this.server = server);
		}
		if (server === 'http') {
			this.protocol = 'ws';
			return (this.server = http.createServer(serverOptions));
		}
		if (server === 'https') {
			this.protocol = 'wss';
			return (this.server = https.createServer(serverOptions));
		}
		throw new Error('Invalid option passed for server');
	}

	setHostAndIp({ ws, req }) {
		ws.host = req.headers.host;
		ws.ipAddress = req.socket.remoteAddress;
	}

	async kickIfBanned({ ws }) {
		const { clientId, host, ipAddress } = ws;
		const isBanned = await this.dataStore.hasBanRule({
			clientId,
			host,
			ipAddress,
		});
		if (isBanned) return await this.kick({ ws });
	}

	async kickAndBan({ ws }) {
		const { clientId, host, ipAddress } = ws;
		await this.security.ban({ clientId, host, ipAddress });
		await this.kick({ ws });
	}

	async kick({ ws }) {
		const action = 'kick';
		const data = 'Server has kicked the client';
		const noReply = true;
		await this.rpc.send({ ws, action, data, noReply });
		return ws.close();
	}

	async attachConnectionEventListeners(ws, req) {
		const { connectionEventListeners, setHostAndIp } = this;
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

		setHostAndIp({ ws, req });
		await requestClientId({ ws, rpc: this.rpc });
		await this.kickIfBanned({ ws });
	}

	attachBindings() {
		this.rpc.add('has-client-id', checkHasClientId);

		this.wss.on('connection', (ws, req) => {
			this.serverEventListeners.connection.forEach((func) =>
				func(ws, req)
			);
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
