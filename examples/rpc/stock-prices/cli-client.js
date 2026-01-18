// Dependencies
import repl from "node:repl";

// Shims to make this work on Node.js rather than the web browser
// It would be great to have this automatically loaded into HubClient and auto-detect

// Other dependencies
import HubClient from "../../../dist/esm/lib/client/HubClient.node.js";
import { enableMessageLogger } from "./messageLogger.js";

// Starts the repl
const replInstance = repl.start("> ");
const hubClient = new HubClient({ url: "ws://localhost:5050" });

// // This enables message logging
enableMessageLogger(hubClient.sarus);

// Tests an RPC call
const getPrice = async (symbol) => {
	try {
		const request = {
			action: "get-price",
			data: { stock: symbol },
		};
		const { stock } = await hubClient.rpc.send(request);
		console.log({ stock });
	} catch (err) {
		console.error(err);
	}
};

replInstance.context.getPrice = getPrice;
replInstance.context.exit = process.exit;

/*

On the REPL, you can call the following commands:

await getPrice("AMZN");
await getPrice("META");
await getPrice("MSFT");
await getPrice("AAPL");
await getPrice("GOOGL");
await getPrice("NVDA");
await getPrice("NFLX");

exit(); // to exit the REPL
*/
