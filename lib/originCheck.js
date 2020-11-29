/*
    Origin Checking
    ---------------

    This is a security feature that implements checks on the origin that the 
    client is connecting from. If the feature is enabled on the server, then 
    the server can specify a list of urls that WebSocket clients are allowed
    to connect from.

    If a WebSocket client attempts to connect, the check is performed. If 
    their origin is allowed, normal operations continue. But if their origin
    is not allowed, then they are immediately disconnected.
*/

function checkOrigin(origins, origin) {
	if (!origins || origins.length === 0) return true;
	for (const originItem of origins) {
		if (originItem.match(origin) !== null) return true;
	}
	return false;
}

function handleOriginCheck(origins, next) {
	return function (socket, req) {
		if (!checkOrigin(origins, req.headers.host)) {
			socket.close();
		} else {
			next(socket, req);
		}
	};
}

module.exports = { checkOrigin, handleOriginCheck };