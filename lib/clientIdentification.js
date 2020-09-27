// Dependencies
const { v4: uuidv4 } = require('uuid');

/*
	Sends a message from server to client,
	requesting the client's id
*/
function requestClientId(ws) {
	const payload = {
		action: 'request-client-id',
	};
	ws.send(JSON.stringify(payload));
	return {
		success: true,
		message: 'Requested id from client',
	};
}

// create client id, set on ws, and send to client for attaching on their end
function setAndSendClientId(ws) {
	const clientId = uuidv4();
	const payload = {
		action: 'set-client-id',
		data: { clientId },
	};
	ws.send(JSON.stringify(payload));
	ws.clientId = clientId;
	return {
		success: true,
		message: 'clientId set on WebSocket',
	};
}

function processClientId({ data, ws }) {
	if (data.clientId) {
		ws.clientId = data.clientId;
		return {
			success: true,
			message: 'clientId set on WebSocket',
		};
	} else {
		return setAndSendClientId(ws);
	}
}

module.exports = { requestClientId, processClientId, setAndSendClientId };
