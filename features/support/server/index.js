// Dependencies
const httpShutdown = require('http-shutdown');
const Hub = require('../../../index');

// Initialise an instance of Hub
const hub = new Hub({
	port: 3001, // The port to listen on
});

const messages = [];

hub.connectionEventListeners.message.push(({ message }) => {
	messages.push(message);
});

// NOTE - add something that records messages being sent to the server from the client,
// and then have a way to inspect those messages from cucumber

// Start the server with http-shutdown
const server = httpShutdown(
	hub.server.listen(hub.port, () => {
		console.log('WS Server is listening on port', hub.port);
	})
);

module.exports = { hub, server, messages };
