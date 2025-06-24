// Dependencies
import httpShutdown from "http-shutdown";
import Hub from "../../../dist/esm/index.js";

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

export { hub, server, messages };
