// Dependencies
const { Hub } = require("../../index");
const hub = new Hub({ port: 5050, dataStoreType: "redis" });

// The message logger helper function
const messageLogger = (hub) => {
	const messages = [];

	// This is the console log on all messages received by the server
	hub.connectionEventListeners.message.push(({ message }) => {
		console.log(message);
		messages.push(message);
	});
};

messageLogger(hub);

const stocks = {
	amzn: 52.85,
};

setInterval(() => {
	const movement = Math.random() > 0.5 ? 1 : -1;
	const amount = Math.random();
	stocks.amzn += Number.parseFloat((movement * amount).toFixed(2));
}, 1000);

const getPricesFunction = ({ data, reply }) => {
	const stock = stocks[data.stock];
	reply({ data: { stock } });
};

hub.rpc.add("get-prices", getPricesFunction);

hub.server.listen(5050).on("error", (err) => {
	throw err;
});
