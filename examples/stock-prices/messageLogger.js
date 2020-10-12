// Dependencies
const gradient = require('gradient-string');

const enableMessageLogger = (sarus) => {
	const messages = [];
	const logMessage = (event) => {
		const message = JSON.parse(event.data);
		messages.push(message);
		console.log(gradient.pastel(JSON.stringify(message)));
	};

	sarus.on('message', logMessage);
};

module.exports = { enableMessageLogger };
