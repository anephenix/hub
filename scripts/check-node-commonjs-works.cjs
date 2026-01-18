// This is a simple test to check if the CommonJS version of the file works
const Hub = require("../dist/esm/index.js").default;
const HubClient = require("../dist/esm/lib/client/HubClient.node.js").default;
// TODO - is there a way to required without the .default, perhaps as a separate .cjs file?

// Configuration
const port = 3001;

// Create a new Hub instance and listen on port 3001
const hub = new Hub({ port });

hub.listen();
console.log(`Hub is listening on port ${port}`);

const hubClient = new HubClient({ url: `ws://localhost:${port}` });
hubClient.sarus.on("open", () => {
	console.log("HubClient connected to the Hub");
});

hubClient.sarus.on("message", (message) => {
	console.log("Received message from Hub:", message.data);
});

hubClient.sarus.on("error", (error) => {
	console.error(error);
	console.error("Error in HubClient:", error);
	process.exit(1); // Exit the process on error
});

hubClient.sarus.on("close", () => {
	console.log("HubClient connection closed");
});

async function disconnectClientAndThenServer() {
	await new Promise((resolve) => setTimeout(resolve, 500));
	await hubClient.sarus.disconnect();
	console.log("HubClient disconnected");
	await new Promise((resolve) => setTimeout(resolve, 500));
	await hub.server.close();
	console.log("Hub server closed");
}

// Invoke the disconnect function after a delay
(async () => {
	await disconnectClientAndThenServer();
})();
