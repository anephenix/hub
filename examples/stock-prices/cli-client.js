// Dependencies
const repl = require('repl');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const gradient = require('gradient-string');
const messages = [];

const Sarus = require('@anephenix/sarus');
const enableHubSupport = require('./hub-cli-client');
const replInstance = repl.start('> ');

const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
enableHubSupport(sarus);

const logMessage = (event) => {
	const message = JSON.parse(event.data);
	messages.push(message);
	console.log(gradient.pastel(JSON.stringify(message)));
};
sarus.on('message', logMessage);

replInstance.context.sarus = sarus;
replInstance.context.messages = messages;
replInstance.context.exit = process.exit;

let payload = {
	id: 'y',
	action: 'get-prices',
	type: 'request',
	data: { stock: 'amzn' },
};

const sendRPCMessage = (payload) => {
	sarus.send(JSON.stringify(payload));
};

sendRPCMessage(payload);

// Be good to have an example to play with, but also a way to handle the response

/*

sarus.send(JSON.stringify(payload))

*/
