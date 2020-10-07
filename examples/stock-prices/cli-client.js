// Dependencies
const repl = require('repl');
const WebSocket = require('ws');
global.WebSocket = WebSocket;
const gradient = require('gradient-string');
const messages = [];

const clientIdKey = 'sarus-client-id';
const storageType = 'localStorage';

const Sarus = require('@anephenix/sarus');
const { enableHubSupport, RPC } = require('./hub-cli-client');
const replInstance = repl.start('> ');

const sarus = new Sarus.default({ url: 'ws://localhost:5000' });
enableHubSupport(sarus);
const rpc = new RPC({ sarus });

const logMessage = (event) => {
	const message = JSON.parse(event.data);
	messages.push(message);
	console.log(gradient.pastel(JSON.stringify(message)));
};

// How would we queue this response to the
// id, type, data, action, sarus
// id is only useful for stitching together a request with its response
rpc.add('get-prices', ({ type, data }) => {
	if (type === 'response') {
		console.log({ stock: data.stock });
	} else if (type === 'error') {
		console.error(data);
	}
});

// We would need to tweak the clientIdentification to handle this
// plus get it to generate an rpc id
rpc.add('get-client-id', ({ id, type, action, sarus }) => {
	if (type === 'request') {
		const clientId = global[storageType].getItem(clientIdKey);
		const payload = {
			id,
			action,
			type: 'response',
			data: { clientId },
		};
		sarus.send(JSON.stringify(payload));
	}
});

sarus.on('message', logMessage);
sarus.on('message', rpc.call);

replInstance.context.sarus = sarus;
replInstance.context.messages = messages;
replInstance.context.rpc = rpc;
replInstance.context.exit = process.exit;

rpc.send({ action: 'get-prices', data: { stock: 'amzn' } });
