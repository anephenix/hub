/*
	Main Library
	------------

	This is the JavaScript class where the library's parts come together.
*/

// Dependencies
import http, {
	type Server as HttpServer,
	type ServerOptions as HttpServerOptions,
} from "node:http";
import https from "node:https";
import type {
	Server as HttpsServer,
	ServerOptions as HttpsServerOptions,
} from "node:https";
// This bit needs tidying up - 3 lines for the same npm package
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import type { WebSocket as WSWebSocket } from "ws";
import { requestClientId, checkHasClientId } from "./clientId";
import dataStores from "./dataStores";
import PubSub from "./pubsub";
import RPC from "./rpc";
import { Security } from "./security";
import { handleOriginCheck } from "./originCheck";
import { handleIpAddressCheck } from "./ipCheck";
import {
	auditServerEventListeners,
	auditConnectionEventListeners,
} from "./validators";

type DataStoreType = keyof typeof dataStores;
type DataStoreInstance = InstanceType<
	(typeof dataStores)[keyof typeof dataStores]
>;

interface HubOptions {
	port: number;
	serverType?: "http" | "https";
	server?: HttpServer | HttpsServer;
	serverOptions?: HttpServerOptions | HttpsServerOptions | null;
	serverEventListeners?: Partial<ServerEventListeners>;
	connectionEventListeners?: Partial<ConnectionEventListeners>;
	dataStoreType?: DataStoreType;
	dataStoreOptions?: Record<string, unknown>;
	allowedOrigins?: string[];
	allowedIpAddresses?: string[];
}

interface ConnectionEventListeners {
	message: Array<(args: { message: WebSocket.Data; ws: WSWebSocket }) => void>;
	close: Array<
		(args: { event: WebSocket.CloseEvent; ws: WSWebSocket }) => void
	>;
	error: Array<(args: { error: Error; ws: WSWebSocket }) => void>;
}

interface ServerEventListeners {
	connection: Array<(ws: WSWebSocket, req: http.IncomingMessage) => void>;
	error: Array<(event: Error) => void>;
	listening: Array<(event: unknown) => void>;
	headers: Array<(event: unknown) => void>;
	close: Array<(event: unknown) => void>;
}

interface AttachConnectionEventListenersArgs {
	ws: WSWebSocket & { [key: string]: () => void };
	req: http.IncomingMessage;
}

class Hub {
	port: number;
	server: HttpServer | HttpsServer;
	wss: WebSocketServer;
	protocol: "ws" | "wss";
	allowedOrigins: string[];
	allowedIpAddresses: string[];
	rpc: RPC;
	dataStore: DataStoreInstance;
	pubsub: PubSub;
	security: Security;
	connectionEventListeners: ConnectionEventListeners;
	serverEventListeners: ServerEventListeners;

	constructor({
		port,
		server,
		serverType = "http",
		serverOptions = null,
		serverEventListeners,
		connectionEventListeners,
		dataStoreType,
		dataStoreOptions = {},
		allowedOrigins,
		allowedIpAddresses,
	}: HubOptions) {
		this.port = port;
		this.setServer({ server, serverType, serverOptions });
		this.wss = new WebSocketServer({ server: this.server });
		this.attachConnectionEventListeners =
			this.attachConnectionEventListeners.bind(this);
		this.allowedOrigins = allowedOrigins || [];
		this.allowedIpAddresses = allowedIpAddresses || [];
		this.rpc = new RPC();
		this.attachDataStore({ dataStoreType, dataStoreOptions });
		this.pubsub = new PubSub({
			wss: this.wss,
			rpc: this.rpc,
			dataStore: this.dataStore,
		});
		this.security = new Security({ dataStore: this.dataStore });
		this.attachEventListeners({
			connectionEventListeners,
			serverEventListeners,
		});
		this.attachBindings();
	}

	attachDataStore({
		dataStoreType,
		dataStoreOptions,
	}: {
		dataStoreType?: DataStoreType;
		dataStoreOptions?: Record<string, unknown>;
	}) {
		const DataStore = dataStores[dataStoreType || "memory"];
		if (!DataStore)
			throw new Error(`dataStoreType "${dataStoreType}" is not a valid option`);
		this.dataStore = new DataStore(dataStoreOptions);
	}

	attachEventListeners({
		connectionEventListeners,
		serverEventListeners,
	}: {
		connectionEventListeners?: Partial<ConnectionEventListeners>;
		serverEventListeners?: Partial<ServerEventListeners>;
	}) {
		this.connectionEventListeners =
			auditConnectionEventListeners(connectionEventListeners) ||
			this.loadDefaultConnectionEventListeners();

		this.serverEventListeners =
			auditServerEventListeners(serverEventListeners) ||
			this.loadDefaultServerEventListeners();
	}

	loadDefaultConnectionEventListeners(): ConnectionEventListeners {
		return {
			message: [this.rpc.receive.bind(this.rpc)],
			close: [this.pubsub.unsubscribeClientFromAllChannels.bind(this.pubsub)],
			error: [],
		};
	}

	loadDefaultServerEventListeners(): ServerEventListeners {
		return {
			connection: [
				handleOriginCheck(
					this.allowedOrigins,
					handleIpAddressCheck(
						this.allowedIpAddresses,
						this.attachConnectionEventListeners,
					),
				),
			],
			error: [],
			listening: [],
			headers: [],
			close: [],
		};
	}

	setServer({
		server,
		serverType,
		serverOptions,
	}: {
		serverType?: "http" | "https";
		server?: HttpServer | HttpsServer;
		serverOptions?: HttpServerOptions | HttpsServerOptions | null;
	}) {
		if (!serverType && !server) {
			this.protocol = "ws";
			this.server = http.createServer(serverOptions || undefined);
			return;
		}
		if (server) {
			if (server instanceof https.Server) {
				this.protocol = "wss";
				this.server = server;
				return;
			}
			if (server instanceof http.Server) {
				this.protocol = "ws";
				this.server = server;
				return;
			} else {
				throw new Error("Invalid option passed for server");
			}
		}
		if (serverType === "http" || serverType === "https") {
			if (serverType === "http") {
				this.protocol = "ws";
				this.server = http.createServer(serverOptions || undefined);
				return;
			} else if (serverType === "https") {
				this.protocol = "wss";
				this.server = https.createServer(serverOptions || undefined);
				return;
			}
		}
		throw new Error("Invalid option passed for server");
	}

	setHostAndIp({
		ws,
		req,
	}: {
		ws: WSWebSocket & { [key: string]: unknown };
		req: http.IncomingMessage;
	}) {
		ws.host = req.headers.host;
		ws.ipAddress = req.socket.remoteAddress;
	}

	async kickIfBanned({ ws }: { ws: WSWebSocket & { [key: string]: unknown } }) {
		const { clientId, host, ipAddress } = ws;
		const isBanned = await this.dataStore.hasBanRule({
			clientId,
			host,
			ipAddress,
		});
		if (isBanned) return await this.kick({ ws });
	}

	async kickAndBan({ ws }: { ws: WSWebSocket & { [key: string]: unknown } }) {
		const { clientId, host, ipAddress } = ws;
		await this.security.ban({ clientId, host, ipAddress });
		await this.kick({ ws });
	}

	async kick({ ws }: { ws: WSWebSocket & { [key: string]: unknown } }) {
		const action = "kick";
		const data = "Server has kicked the client";
		const noReply = true;
		await this.rpc.send({ ws, action, data, noReply });
		return ws.close();
	}

	async attachConnectionEventListeners(
		ws: WSWebSocket & { [key: string]: unknown },
		req: http.IncomingMessage,
	) {
		const { connectionEventListeners, setHostAndIp } = this;
		ws.on("message", (message: WebSocket.Data) => {
			for (const func of connectionEventListeners.message) {
				func({ message, ws });
			}
		});

		ws.on("close", (event: WebSocket.CloseEvent) => {
			for (const func of connectionEventListeners.close) {
				func({ event, ws });
			}
		});

		ws.on("error", (error: Error) => {
			for (const func of connectionEventListeners.error) {
				func({ error, ws });
			}
		});

		setHostAndIp({ ws, req });
		await requestClientId({ ws, rpc: this.rpc });
		await this.kickIfBanned({ ws });
	}

	attachBindings() {
		this.rpc.add("has-client-id", checkHasClientId);

		this.wss.on("connection", (ws: WSWebSocket, req: http.IncomingMessage) => {
			for (const func of this.serverEventListeners.connection) {
				func(ws, req);
			}
		});

		this.wss.on("close", (event: unknown) => {
			for (const func of this.serverEventListeners.close) {
				func(event);
			}
		});

		this.wss.on("error", (event: Error) => {
			for (const func of this.serverEventListeners.error) {
				func(event);
			}
		});

		this.wss.on("listening", (event: unknown) => {
			for (const func of this.serverEventListeners.listening) {
				func(event);
			}
		});

		this.wss.on("headers", (event: unknown) => {
			for (const func of this.serverEventListeners.headers) {
				func(event);
			}
		});
	}

	listen() {
		this.server.listen(this.port);
		return this.server;
	}
}

export default Hub;
