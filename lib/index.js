const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class Hub {
	constructor(port) {
		this.port = port;
		this.server = http.createServer();
		this.wss = new WebSocket.Server({ server: this.server });
		this.attachBindings();
	}

	requestClientId(ws) {
		console.log('Requesting client ID'); // TODO - put this in a logger
		const payload = {
			action: 'request-client-id',
		};
		ws.send(JSON.stringify(payload));
	}

	// create client id, set on ws, and send to client for attaching on their end
	setAndSendClientId(ws) {
		console.log('Creating client ID'); // TODO - put this in a logger
		const clientId = uuidv4();
		const payload = {
			action: 'set-client-id',
			data: { clientId },
		};
		ws.send(JSON.stringify(payload));
		ws.clientId = clientId;
	}

	processClientId(data, ws) {
		if (data.clientId) {
			// Make sure client Id is assigned to ws
			// NOTE - might need to do this via call that loops through wss.clients
			ws.clientId = data.clientId;
		} else {
			this.setAndSendClientId(ws);
		}
	}

	parseMessage(message, ws) {
		try {
			const payload = JSON.parse(message);
			if (payload.action) {
				if (payload.action === 'reply-client-id') {
					console.log('Received reply');
					this.processClientId(payload.data, ws);
				}
			} else {
				console.log('received: %s', message);
			}
		} catch (err) {
			console.log('Error parsing message received from client');
			console.error(err);
		}
	}

	attachBindings() {
		this.wss.on('connection', (ws) => {
			console.log('Connection opened');

			// This is the point at which we send a message to the client
			// to request the client id
			this.requestClientId(ws);

			// Handle messages received from the client
			ws.on('message', (message) => {
				this.parseMessage(message, ws);
			});

			ws.on('close', (x) => {
				console.log('Connection closed');
				console.log(x);
			});
		});

		// Not exactly sure how this is triggered
		this.wss.on('close', (x) => {
			console.log('Closed');
			console.log(x);
		});

		this.wss.on('error', (x) => {
			console.log('Error occurred');
			console.log(x);
		});

		this.wss.on('listening', (x) => {
			console.log('Listening');
			console.log(x);
		});

		this.wss.on('headers', (x) => {
			console.log('Headers');
			console.log(x);
		});
	}

	listen() {
		this.server.listen(this.port);
	}
}

module.exports = Hub;
