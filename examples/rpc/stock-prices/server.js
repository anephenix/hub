// Dependencies
import Hub from "../../../dist/esm/index.js";

const hub = new Hub({ port: 5050 });

// The message logger helper function
const messageLogger = (hub) => {
	const messages = [];

	// This is the console log on all messages received by the server
	hub.connectionEventListeners.message.push(({ message }) => {
		messages.push(message);
	});
};

// Attach the message logger function to hub
messageLogger(hub);

// Some example stock price data, prices taken from end-of-day on 2025/06/23
const stocks = {
	AMZN: 208.47,
	META: 698.53,
	MSFT: 486.0,
	AAPL: 201.5,
	GOOGL: 165.19,
	NVDA: 144.17,
	NFLX: 1253.54,
};

// We use this to simlate the "random walk" of stock prices on the markets
const performRandomWalk = () => {
	for (const symbol in stocks) {
		const change = (Math.random() - 0.5) * 2; // random value between -1 and 1
		stocks[symbol] = Math.max(0, +(stocks[symbol] + change).toFixed(2));
	}
	// Prints the updated stock prices to the console, comment out
	console.log("Updated stock prices:", stocks);
};

// Update stock prices every second to simulate market changes
setInterval(performRandomWalk, 1000);

const getPriceFunction = ({ data, reply }) => {
	const stock = stocks[data.stock];
	reply({ data: { stock } });
};

hub.rpc.add("get-price", getPriceFunction);

hub.server.listen(5050).on("error", (err) => {
	throw err;
});
