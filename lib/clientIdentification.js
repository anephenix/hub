// Dependencies
const { v4: uuidv4 } = require('uuid');

const requestClientId = (ws) => {
	// console.log('Requesting client ID'); // TODO - put this in a logger
	const payload = {
		action: 'request-client-id',
	};
	ws.send(JSON.stringify(payload));
};

// create client id, set on ws, and send to client for attaching on their end
const setAndSendClientId = (ws) => {
	// console.log('Creating client ID'); // TODO - put this in a logger
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
};

const processClientId = ({ data, ws }) => {
	if (data.clientId) {
		// Make sure client Id is assigned to ws
		// NOTE - might need to do this via call that loops through wss.clients
		ws.clientId = data.clientId;
		return {
			success: true,
			message: 'clientId set on WebSocket',
		};
	} else {
		return setAndSendClientId(ws);
	}
};

module.exports = { requestClientId, processClientId, setAndSendClientId };
