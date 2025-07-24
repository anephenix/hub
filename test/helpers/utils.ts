import os from "node:os";

function getIPV6InternalAddress(): string | undefined {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name]!) {
			if (iface.family === "IPv6" && iface.internal) {
				return iface.address;
			}
		}
	}
	return undefined;
}

function getIPV6MappedIPV4InternalAddress(): string | undefined {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name]!) {
			if (iface.family === "IPv4" && iface.internal) {
				const ipv6Mapped = `::ffff:${iface.address}`;
				return ipv6Mapped;
			}
		}
	}
	return undefined;
}

function getLocalIPV6Address(): string {
	let ipAddress: string | undefined = undefined;
	const isMyLocalLinux =
		process.platform === "linux" && os.hostname() === "paulbjensen";
	if (isMyLocalLinux) {
		ipAddress = getIPV6MappedIPV4InternalAddress() || getIPV6InternalAddress();
	}
	if (!ipAddress) ipAddress = "::1"; // Fallback to localhost in it is still undefined
	return ipAddress;
}

export {
	getIPV6InternalAddress,
	getIPV6MappedIPV4InternalAddress,
	getLocalIPV6Address,
};
