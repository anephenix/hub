/*
    IP Address Checking
    ---------------

    This is a security feature that implements checks on the ip address that 
    the client is connecting from. If the feature is enabled on the server, 
    then the server can specify a list of ip addresses that WebSocket clients 
    are allowed to connect from.

    If a WebSocket client attempts to connect, the check is performed. If 
    their ip address is allowed, normal operations continue. But if their ip 
    address is not allowed, then they are immediately disconnected.
*/

function checkIpAddress(ipAddresses, ipAddress) {
	if (!ipAddresses || ipAddresses.length === 0) return true;
	for (const ipAddressItem of ipAddresses) {
		if (ipAddressItem.match(ipAddress) !== null) return true;
	}
	return false;
}

function handleIpAddressCheck(ipAddresses, next) {
	return function (socket, req) {
		if (!checkIpAddress(ipAddresses, req.socket.remoteAddress)) {
			socket.close();
		} else {
			next(socket, req);
		}
	};
}

module.exports = { checkIpAddress, handleIpAddressCheck };