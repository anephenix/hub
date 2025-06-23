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
import type {
	Server as HttpsServer,
	ServerOptions as HttpsServerOptions,
} from "node:https";
import https from "node:https";
import { type CloseEvent, WebSocketServer } from "ws";
import { checkHasClientId, requestClientId } from "./clientId.js";
import dataStores from "./dataStores/index.js";
import { handleIpAddressCheck } from "./ipCheck.js";
import { handleOriginCheck } from "./originCheck.js";
import PubSub from "./pubsub.js";
import RPC from "./rpc.js";
import { Security } from "./security.js";

import type {
	ConnectionEventListeners,
	DataStoreInstance,
	DataStoreType,
	RedisDataStoreConfig,
	RPCFunction,
	ServerEventListeners,
	WebSocketWithClientId,
} from "./types.js";

interface HubOptions {
	port: number;
	serverType?: "http" | "https";
	server?: HttpServer | HttpsServer;
	serverOptions?: HttpServerOptions | HttpsServerOptions | null;
	serverEventListeners?: ServerEventListeners;
	connectionEventListeners?: ConnectionEventListeners;
	dataStoreType?: DataStoreType;
	dataStoreOptions?: Record<string, unknown>;
	allowedOrigins?: string[];
	allowedIpAddresses?: string[];
}

class Hub {
	port: number;
	server!: HttpServer | HttpsServer;
	wss: WebSocketServer;
	protocol!: "ws" | "wss";
	allowedOrigins: string[];
	allowedIpAddresses: string[];
	rpc: RPC;
	dataStore!: DataStoreInstance;
	pubsub: PubSub;
	security: Security;
	connectionEventListeners!: ConnectionEventListeners;
	serverEventListeners!: ServerEventListeners;

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
		dataStoreOptions?: Record<string, unknown> | RedisDataStoreConfig;
	}) {
		type DataStoreKey = keyof typeof dataStores;
		const type: DataStoreKey = (dataStoreType || "memory") as DataStoreKey;
		const DataStore = dataStores[type];
		if (!DataStore)
			throw new Error(
				`dataStoreType "${String(dataStoreType)}" is not a valid option`,
			);
		this.dataStore = new DataStore(dataStoreOptions || {});
	}

	attachEventListeners({
		connectionEventListeners,
		serverEventListeners,
	}: {
		connectionEventListeners?: ConnectionEventListeners;
		serverEventListeners?: ServerEventListeners;
	}) {
		this.connectionEventListeners =
			connectionEventListeners || this.loadDefaultConnectionEventListeners();
		this.serverEventListeners =
			serverEventListeners || this.loadDefaultServerEventListeners();
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
			this.server = serverOptions
				? http.createServer(serverOptions)
				: http.createServer();
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
			}
			throw new Error("Invalid option passed for server");
		}
		if (serverType === "http" || serverType === "https") {
			if (serverType === "http") {
				this.protocol = "ws";
				this.server = serverOptions
					? http.createServer(serverOptions)
					: http.createServer();
				return;
			}
			// Would be https at this point
			this.protocol = "wss";
			this.server = serverOptions
				? https.createServer(serverOptions)
				: https.createServer();
			return;
		}
		throw new Error("Invalid option passed for server");
	}

	setHostAndIp({
		ws,
		req,
	}: {
		ws: WebSocketWithClientId;
		req: http.IncomingMessage;
	}) {
		ws.host = req.headers.host;
		ws.ipAddress = req.socket.remoteAddress;
	}

	async kickIfBanned({ ws }: { ws: WebSocketWithClientId }) {
		const { clientId, host, ipAddress } = ws;
		const isBanned = await this.dataStore.hasBanRule({
			clientId,
			host,
			ipAddress,
		});
		if (isBanned) return await this.kick({ ws });
	}

	async kickAndBan({ ws }: { ws: WebSocketWithClientId }) {
		const { clientId, host, ipAddress } = ws;
		if (clientId && host && ipAddress) {
			await this.security.ban({ clientId, host, ipAddress });
			await this.kick({ ws });
		}
	}

	async kick({ ws }: { ws: WebSocketWithClientId }) {
		const action = "kick";
		const data = "Server has kicked the client";
		const noReply = true;
		await this.rpc.send({ ws, action, data, noReply });
		return ws.close();
	}

	async attachConnectionEventListeners(
		ws: WebSocketWithClientId,
		req: http.IncomingMessage,
	) {
		const { connectionEventListeners, setHostAndIp } = this;
		ws.on("message", (message: string) => {
			for (const func of connectionEventListeners.message) {
				func({ message, ws });
			}
		});

		ws.on("close", (event: CloseEvent) => {
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
		this.rpc.add("has-client-id", checkHasClientId as RPCFunction);

		this.wss.on(
			"connection",
			(ws: WebSocketWithClientId, req: http.IncomingMessage) => {
				for (const func of this.serverEventListeners.connection) {
					func(ws, req);
				}
			},
		);

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
