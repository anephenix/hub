// Dependencies
const Hub = require('../../index');

const hub = new Hub({ port: 5000 });

const messages = [];

hub.connectionEventListeners.message.push(({ message }) => {
	console.log(message);
	messages.push(message);
});

const getPricesFunction = ({ id, action, type, data, ws }) => {
	const stocks = {
		amzn: 52.85,
	};

	if (type === 'request') {
		let stock = stocks[data.stock];
		const response = {
			id,
			action,
			type: 'response',
			data: { stock },
		};
		ws.send(JSON.stringify(response));

		setInterval(() => {
			stock += 1;
			const response = {
				id,
				action,
				type: 'response',
				data: { stock },
			};
			ws.send(JSON.stringify(response));
		}, 1000);
	}
};

hub.rpc.add('get-prices', getPricesFunction);

hub.server.listen(5000);
