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

export function checkIpAddress(
	ipAddresses: RegExp[] | undefined,
	ipAddress: string,
): boolean {
	if (!ipAddresses || ipAddresses.length === 0) return true;
	for (const ipAddressItem of ipAddresses) {
		return new RegExp(ipAddressItem).test(ipAddress);
	}
	return false;
}

type Socket = {
	close: () => void;
};

type Request = {
	socket: {
		remoteAddress?: string;
	};
};

type NextFunction = (socket: Socket, req: Request) => void;

export function handleIpAddressCheck(
	ipAddresses: RegExp[] | undefined,
	next: NextFunction,
) {
	return (socket: Socket, req: Request) => {
		const remoteAddress = req.socket.remoteAddress || "";
		if (!checkIpAddress(ipAddresses, remoteAddress)) {
			socket.close();
		} else {
			next(socket, req);
		}
	};
}
