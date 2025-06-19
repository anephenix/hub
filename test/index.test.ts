import assert from "node:assert";
import fs from "node:fs";
import http from "node:http";
import https, { type ServerOptions as HttpsServerOptions } from "node:https";
import path from "node:path";
import { createHttpTerminator } from "http-terminator";
import { afterAll, beforeAll, describe, it } from "vitest";
import type { WebSocketServer } from "ws";
import { delay, delayUntil } from "../src/helpers/delay";
import { Hub, HubClient } from "../src/index";
import {
	type WebSocketWithClientId,
	checkHasClientId,
} from "../src/lib/clientId";
import type RedisDataStore from "../src/lib/dataStores/redis";

describe("Hub", () => {
	it("should return a class function", () => {
		assert.strictEqual(typeof Hub, "function");
		assert(Hub instanceof Object);
		assert.strictEqual(
			Object.getOwnPropertyNames(Hub).includes("arguments"),
			false,
		);
	});

	describe("an instance of Hub", () => {
		const hub = new Hub({ port: 4000 });
		it("should initialize a http server by default", () => {
			assert(hub.server);
		});
		it("should initialize a websocket server by default", () => {
			assert(hub.wss);
		});
		it("should attach event listener bindings to the websocket server", () => {
			assert(hub.serverEventListeners.connection.length === 1);
			assert(hub.serverEventListeners.listening.length === 0);
			assert(hub.serverEventListeners.headers.length === 0);
			assert(hub.serverEventListeners.error.length === 0);
			assert(hub.serverEventListeners.close.length === 0);
			assert(hub.connectionEventListeners.message.length > 0);
			assert(hub.connectionEventListeners.error.length === 0);
			assert(hub.connectionEventListeners.close.length === 1);
			assert.strictEqual(
				(hub.wss as WebSocketServer).listenerCount("connection"),
				1,
			);
		});
		describe("#listen", () => {
			hub.server.listen(4000).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });

			afterAll(async () => {
				await terminator.terminate();
			});

			it("should listen on the given port, and return the server", async () => {
				let connected = false;
				const client = new WebSocket("ws://localhost:4000");
				client.onopen = () => {
					connected = true;
				};
				await delayUntil(() => client.readyState === 1);
				assert(connected);
				client.close();
			});

			it("should attach the connection event listeners", async () => {
				let connected = false;
				const messages: unknown[] = [];
				const client = new WebSocket("ws://localhost:4000");
				client.onopen = () => {
					connected = true;
				};
				client.onmessage = (event: MessageEvent) => {
					messages.push(JSON.parse(event.data as string));
				};
				await delayUntil(() => client.readyState === 1);
				assert(connected);
				const latestMessage = messages[messages.length - 1] as {
					action: string;
				};
				assert(latestMessage.action === "get-client-id");
				client.send(
					JSON.stringify({
						action: "get-client-id",
						data: { clientId: null },
					}),
				);
				client.close();
			});

			it("should attach the hasClientId rpc action", () => {
				assert.deepStrictEqual(hub.rpc.actions["has-client-id"], [
					checkHasClientId,
				]);
			});
		});
	});

	describe("initialising with redis data store options", () => {
		let hub: Hub;
		let hubClient: HubClient;
		beforeAll(() => {
			hub = new Hub({
				port: 4005,
				dataStoreType: "redis",
				dataStoreOptions: {
					redisConfig: {
						db: 1,
					},
				},
			});
			hub.listen();
			hubClient = new HubClient({ url: "ws://localhost:4005" });
		});

		afterAll(async () => {
			const { redis, channelsKey, clientsKey } = hub.pubsub
				.dataStore as RedisDataStore;
			await redis.del(channelsKey);
			await redis.del(clientsKey);
			hubClient.sarus.disconnect();
			hub.server.close();
			await delay(100);
			try {
				await (hub.pubsub.dataStore as RedisDataStore).internalRedis.quit();
				await (hub.pubsub.dataStore as RedisDataStore).redis.quit();
			} catch (err) {
				console.error(err);
			}
		});

		it("should have a redis client", () => {
			assert((hub.pubsub.dataStore as RedisDataStore).redis);
		});

		it("should handle subscribing a client to a channel", async () => {
			await hubClient.isReady();
			await delayUntil(() => hubClient.getClientId() !== null);
			const response = await hubClient.subscribe("news");
			if (!response.success) {
				console.error(response);
			}
			assert(response.success);
		});

		it("should handle a client publishing a message to a channel", async () => {
			let called = false;
			hubClient.addChannelMessageHandler("news", () => {
				called = true;
			});
			await hubClient.publish("news", "rain is on the way");
			await delayUntil(() => called);
		});

		it("should handle the server publishing a message to a channel", async () => {
			let called = false;
			hubClient.addChannelMessageHandler("news", () => {
				called = true;
			});
			await hub.pubsub.publish({
				data: { channel: "news", message: "rain is on the way" },
			});
			await delayUntil(() => called, 5050);
		});

		it("should handle unsubscribing a client from a channel", async () => {
			const response = await hubClient.unsubscribe("news");
			assert(response.success);
		});
	});

	describe("when a client disconnects from the server", () => {
		it("should unsubscribe that client from any channels they were subscribed to", async () => {
			const newHub = await new Hub({
				port: 5002,
				dataStoreType: "memory",
			});
			newHub.listen();
			const hubClient = new HubClient({ url: "ws://localhost:5002" });

			await hubClient.isReady();
			await hubClient.subscribe("accounts");
			hubClient.sarus.disconnect();
			await delay(100);
			const clientId = hubClient.getClientId();
			if (!clientId) {
				throw new Error("Client ID should not be null");
			}
			const channels =
				await newHub.pubsub.dataStore.getChannelsForClientId(clientId);
			const clientIds =
				await newHub.pubsub.dataStore.getClientIdsForChannel("accounts");
			assert.deepStrictEqual(channels, []);
			assert.deepStrictEqual(clientIds, []);
			newHub.server.close();
		});
	});

	describe("server option", () => {
		const serverOptions: HttpsServerOptions = {
			key: fs.readFileSync(
				path.join(process.cwd(), "certs", "localhost+2-key.pem"),
			),
			cert: fs.readFileSync(
				path.join(process.cwd(), "certs", "localhost+2.pem"),
			),
		};

		describe("when no option is passed", () => {
			it("should load a http server by default", async () => {
				const plainHub = await new Hub({ port: 5003 });
				assert(plainHub.server instanceof http.Server);
				assert.strictEqual(plainHub.protocol, "ws");
			});
		});

		describe("when http is passed", () => {
			it("should load a http server", async () => {
				const plainHub = await new Hub({ port: 5003, serverType: "http" });
				assert(plainHub.server instanceof http.Server);
				assert.strictEqual(plainHub.protocol, "ws");
			});
		});

		describe("when a http server is passed", () => {
			it("should load that http server", async () => {
				const httpServer = http.createServer();
				const plainHub = await new Hub({
					port: 5003,
					server: httpServer,
				});
				assert(plainHub.server instanceof http.Server);
				assert.deepStrictEqual(plainHub.server, httpServer);
				assert.strictEqual(plainHub.protocol, "ws");
			});
		});

		describe("when https is passed", () => {
			it("should load a https server initialialised with the serverOptions", async () => {
				const secureHub = await new Hub({
					port: 5003,
					serverType: "https",
					serverOptions,
				});
				assert(secureHub.server instanceof https.Server);
				assert.strictEqual(secureHub.protocol, "wss");
			});
		});

		describe("when a https server is passed", () => {
			it("should load that https server", async () => {
				const httpsServer = https.createServer(serverOptions);
				const secureHub = await new Hub({
					port: 5003,
					server: httpsServer,
				});
				assert(secureHub.server instanceof https.Server);
				assert.deepStrictEqual(secureHub.server, httpsServer);
				assert.strictEqual(secureHub.protocol, "wss");
			});
		});
	});

	describe("setHostAndIp", () => {
		let hub: Hub;
		let hubClient: HubClient;
		beforeAll(() => {
			hub = new Hub({
				port: 4009,
			});
			hub.listen();
			hubClient = new HubClient({ url: "ws://localhost:4009" });
		});

		afterAll(async () => {
			hubClient.sarus.disconnect();
			hub.server.close();
			await delay(100);
		});

		it("should set the hostname and ip address on the websocket client", async () => {
			await hubClient.isReady();
			const ipAddress = "::1";
			const ws = Array.from(hub.wss.clients)[0] as WebSocketWithClientId;
			assert.strictEqual(ws.host, "localhost:4009");
			assert.strictEqual(ws.ipAddress, ipAddress);
		});
	});

	describe("kick", () => {
		let hub: Hub;
		let hubClient: HubClient;
		const messages: unknown[] = [];

		beforeAll(async () => {
			hub = new Hub({
				port: 4010,
			});
			hub.listen();
			hubClient = new HubClient({ url: "ws://localhost:4010" });
			hubClient.sarus.on("message", (event: { data: string }) => {
				const message = JSON.parse(event.data);
				messages.push(message);
			});

			await hubClient.isReady();
			const ws = Array.from(hub.wss.clients)[0] as WebSocketWithClientId;
			await hub.kick({ ws });
			await delay(100);
		});

		afterAll(async () => {
			hub.server.close();
			await delay(25);
		});

		it("should send a RPC action to the client to stop them from automatically reconnecting", async () => {
			const lastMessage = messages[messages.length - 1] as {
				type: string;
				action: string;
				data: string;
			};
			assert.strictEqual(lastMessage.type, "request");
			assert.strictEqual(lastMessage.action, "kick");
			assert.strictEqual(lastMessage.data, "Server has kicked the client");
		});

		it("should then close the websocket connection to the client", async () => {
			assert.strictEqual(hubClient.sarus.ws?.readyState, 3);
		});
	});

	describe("kickAndBan", () => {
		let hub: Hub;
		let hubClient: HubClient;
		let ws: WebSocketWithClientId;

		beforeAll(async () => {
			hub = new Hub({
				port: 4011,
			});
			hub.listen();
			hubClient = new HubClient({ url: "ws://localhost:4011" });
			await hubClient.isReady();
			ws = Array.from(hub.wss.clients)[0] as WebSocketWithClientId;
			await hub.kickAndBan({ ws });
			await delay(100);
		});

		it("should add the client to the ban list", async () => {
			const { clientId, host, ipAddress } = ws;
			assert(ws.clientId !== null);
			await delayUntil(async () => {
				const hasBeenBanned = await hub.dataStore.hasBanRule({
					clientId,
					host,
					ipAddress,
				});
				return hasBeenBanned;
			});
		});

		it("should then kick the client", () => {
			assert.strictEqual(hubClient.sarus.ws?.readyState, 3);
		});
	});

	describe("kickIfBanned", () => {
		let hub: Hub;
		let hubClient: HubClient;
		let ws: WebSocketWithClientId;

		beforeAll(async () => {
			hub = new Hub({
				port: 4012,
			});
			hub.listen();
		});

		describe("when the client is not banned", () => {
			it("should allow the client to proceed", async () => {
				hubClient = new HubClient({ url: "ws://localhost:4012" });
				await hubClient.isReady();
				ws = Array.from(hub.wss.clients)[0] as WebSocketWithClientId;
				await delay(100);
				assert.strictEqual(hubClient.sarus.ws?.readyState, 1);
			});
		});

		describe("when the client is banned", () => {
			it("should not allow the client to proceed, and kick them off", async () => {
				await hub.kickAndBan({ ws });
				await delay(100);
				hubClient.sarus.connect();
				await delay(100);
				assert.strictEqual(hubClient.sarus.ws?.readyState, 3);
			});
		});
	});
});
