/* 
	Client Id
	---------------------

	This is an rpc plugin that manages getting and setting IDs on WebSocket
	clients. The reason for this is that we need a way to identify WebSocket
	clients so that we can know what channels they should be subscribed to.

	The client id is stored by the WebSocket client, so that should a 
	WebSocket connection be severed and a new connection established, they
	can let the server know that they have a pre-existing client id. That 
	saves the client from having to resubscribe to channels should the 
	WebSocket connection be severed.
*/

// Dependencies
const { v4: uuidv4 } = require('uuid');

/*
*	This generates a new client id, sets it on the websocket client connection,
*	and sends it to the client for them to store it for future reference.
*
*	@params 	ws			The websocket client connection
*	@params 	rpc			The rpc instance
*/
async function generateAndSendNewClientId({ ws, rpc }) {
	const clientId = uuidv4();
	ws.clientId = clientId;
	await rpc.send({
		ws,
		action: 'set-client-id',
		data: { clientId },
	});
}

/*
	This checks whether the reply has a client id, 
	and either sets the client id on the websocket
	client connection, or calls another function
	to generate and send a new client id

	@params		clientId	The unique id for the client
	@params 	ws			The websocket client connection
	@params 	rpc			The rpc instance
*/
async function processReply({ clientId, ws, rpc }) {
	if (clientId) {
		ws.clientId = clientId;
	} else {
		await generateAndSendNewClientId({ ws, rpc });
	}
}

/*
	This makes an RPC request to the client to ask them
	for their client id, and hands off the response to
	the processReply function

	@params 	ws		The websocket client connection
	@params 	rpc		The rpc instance
*/
async function requestClientId ({ ws, rpc }) {
	try {
		const { clientId } = await rpc.send({
			ws,
			action: 'get-client-id',
		});
		// Question - what if the request times out (no reply from client) ?
		// Perhaps RPC needs a timeout - so that multiple websocket clients
		// connecting over time that don't send replies don't end up queuing
		// a ton of unactioned promise functions, which could be an attack
		// vector for a DOS.
		//
		// Write a test case, and see if it works.
		//
		await processReply({ clientId, ws, rpc });
	} catch (err) {
		console.error(err);
	}
}

async function checkHasClientId({ socket, reply }) {
	const hasClientId = !!socket.clientId;
	reply({ data: { hasClientId } });
}

// Expose the Public API
module.exports = { requestClientId, checkHasClientId };
