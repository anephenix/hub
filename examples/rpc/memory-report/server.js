import Hub from "../../../dist/esm/index.js";

const hub = new Hub({ port: 6000 });

hub.wss.on("connection", async (ws) => {
	// When a client connects, we will ask what memory they have.
	// Could be useful for checking devices that are running out of memory,
	const response = await hub.rpc.send({
		ws,
		action: "report-memory",
	});
	console.log("Client reports memory as:", response);
});

hub.listen();
