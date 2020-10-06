// Dependencies
const repl = require('repl');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const messages = [];
const client = new WebSocket('ws://localhost:5000');
client.on('message', (event) => {
	const message = JSON.parse(event);
	messages.push(message);
});

const Sarus = require('@anephenix/sarus');
const enableHubSupport = require('./hub-cli-client');
const replInstance = repl.start('> ');

const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
enableHubSupport(sarus);
sarus.on('message', (event) => {
	const message = JSON.parse(event.data);
	messages.push(message);
	console.log(message);
});

replInstance.context.sarus = sarus;
replInstance.context.messages = messages;
replInstance.context.exit = process.exit;
