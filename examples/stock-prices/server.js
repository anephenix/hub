// Dependencies
const Hub = require('../../index');

//
const hub = new Hub({ port: 5000 });

const messages = [];

hub.connectionEventListeners.message.push(({ message }) => {
	console.log(message);
	messages.push(message);
});

hub.server.listen(5000);
