// Dependencies
const Hub = require('../../index');

const hub = new Hub({ port: 5000 });

const messages = [];

hub.connectionEventListeners.message.push(({ message }) => {
	console.log(message);
	messages.push(message);
});

const stocks = {
	amzn: 52.85,
};

setInterval(() => {
	const movement = Math.random() > 0.5 ? 1 : -1;
	const amount = Math.random();
	stocks.amzn += Number.parseFloat((movement * amount).toFixed(2));
}, 1000);

const getPricesFunction = ({ id, action, type, data, ws }) => {
	if (type === 'request') {
		let stock = stocks[data.stock];
		const response = {
			id,
			action,
			type: 'response',
			data: { stock },
		};
		ws.send(JSON.stringify(response));

		// This example shows that multiple messages can be sent back - for example a progress upload could emit multiple responses
		// setInterval(() => {
		// stock += 1;
		// 	const response = {
		// 		id,
		// 		action,
		// 		type: 'response',
		// 		data: { stock },
		// 	};
		// 	ws.send(JSON.stringify(response));
		// }, 1000);
	}
};

hub.rpc.add('get-prices', getPricesFunction);

hub.server.listen(5000);
