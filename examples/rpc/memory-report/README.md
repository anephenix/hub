# RPC (memory report) example

This is an example of an RPC (Remote Procedure Call) system, where the server 
asks the client to perform an action, and gets back a response.

In this context, we're imagining that a server is asking the client for 
information on the memory statistics of the client's machine.

This demonstrates the ability to use RPC in server-to-client flow (the 
client-to-server flow is also possible, and demonstrated in the stock 
prices example).

The server code looks like this:

```javascript
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
```

And the client code looks like this:

```javascript
import os from "node:os";
import HubClient from "../../../dist/esm/lib/client/HubClient.node.js";

const hubClient = new HubClient({ url: "ws://localhost:6000" });

const reportMemory = ({ reply }) => {
	const freemem = os.freemem();
	const totalmem = os.totalmem();
	reply({ data: { freemem, totalmem } });
};

hubClient.rpc.add("report-memory", reportMemory);
```

## Running the examples

To run the RPC example, do the following:

```shell
node server.js
```

This will run the chat server, which will be listening locally on port 3005.

```shell
node client.js
```

When the client connects to the server, the server will ask it to 
'report-memory' via the RPC call.

If the server process is shut down, and then restarted, you will 
notice that the client will reconnect to the server and the server
will again ask it to 'report-memory', demonstrating the automatic
reconnection feature implemented by the @anephenix/sarus used by Hub.