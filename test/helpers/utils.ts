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

function getLocalInternalAddress(): string {
	let ipAddress: string | undefined;
	const isLinux = process.platform === "linux";
	if (isLinux) {
		ipAddress = getIPV6MappedIPV4InternalAddress() || getIPV6InternalAddress();
	}
	// Fallback to localhost if it is still undefined
	if (!ipAddress) {
		ipAddress = "::1";
	}
	return ipAddress;
}

export {
	getIPV6InternalAddress,
	getIPV6MappedIPV4InternalAddress,
	getLocalInternalAddress,
};
