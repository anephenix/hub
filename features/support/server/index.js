// Dependencies
const httpShutdown = require('http-shutdown');
const { Hub } = require('../../../index');

// Initialise an instance of Hub
const hub = new Hub({
	port: 3001, // The port to listen on
});

const messages = [];

hub.connectionEventListeners.message.push(({ message }) => {
	messages.push(message);
});

// Start the server with http-shutdown
const server = httpShutdown(hub.listen());

module.exports = { hub, server, messages };
