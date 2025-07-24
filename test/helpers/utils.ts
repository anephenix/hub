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
            if (iface.family === 'IPv4' && iface.internal) {
                const ipv6Mapped = `::ffff:${iface.address}`;
                return ipv6Mapped;
            }
        }
    }
    return undefined;
}

export { getIPV6InternalAddress, getIPV6MappedIPV4InternalAddress };