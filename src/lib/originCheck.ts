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

// Types and Interfaces
import type { IncomingMessage } from "node:http";
import type { NextFunction, WebSocketWithClientId } from "./types.js";

/* Check if the origin is allowed */
export function checkOrigin(
	origins: string[] | undefined,
	origin: string,
): boolean {
	if (!origins || origins.length === 0) return true;
	for (const originItem of origins) {
		return new RegExp(originItem).test(origin);
	}
	return false;
}

/* Handle the origin check for a WebSocket connection */
export function handleOriginCheck(
	origins: string[] | undefined,
	next: NextFunction,
) {
	return (socket: WebSocketWithClientId, req: IncomingMessage) => {
		const host = req.headers.host || "";
		if (!checkOrigin(origins, host)) {
			socket.close();
		} else {
			next(socket, req);
		}
	};
}
