const http = require('http');
const WebSocket = require('ws');

class Hub {
	constructor(port) {
		this.port = port;
		this.server = http.createServer();
		this.wss = new WebSocket.Server({ server: this.server });
		this.attachBindings();
	}

	attachBindings() {
		this.wss.on('connection', (ws) => {
			console.log('Connection opened');
			ws.on('message', function (message) {
				console.log('received: %s', message);
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
