// Dependencies
import assert from "node:assert";
import http from "node:http";
import { createHttpTerminator } from "http-terminator";
import { v4 as uuidv4 } from "uuid";
import { beforeAll, describe, it } from "vitest";
import { delayUntil } from "../../src/helpers/delay";
import { Hub, HubClient } from "../../src/index";
import RPC from "../../src/lib/rpc";
import type {
	RPCFunction,
	RPCFunctionArgs,
	WebSocketWithClientId,
} from "../../src/lib/types";

describe("rpc", () => {
	let server: http.Server;
	let rpc: RPC;
	let helloFunc: RPCFunction;

	beforeAll(() => {
		server = http.createServer();
		rpc = new RPC();
	});

	describe("adding an action function", () => {
		it("should add a function for an action name", () => {
			helloFunc = ({ data, reply }) => {
				reply?.({ data });
			};
			rpc.add("hello", helloFunc);
			assert.deepStrictEqual(rpc.list("hello"), [helloFunc]);
		});
	});

	describe("listing actions and their functions", () => {
		it("should list all of the actions and functions that are defined", () => {
			assert.deepStrictEqual(rpc.list(), { hello: [helloFunc] });
		});

		it("should list all of the functions for an action, if an action name is passed", () => {
			assert.deepStrictEqual(rpc.list("hello"), [helloFunc]);
		});
	});

	describe("removing an action function", () => {
		it("should remove a function for an action name", () => {
			const firstFunc = () => {};
			const secondFunc: RPCFunction = ({ data, reply }) => {
				reply?.({ data });
			};
			rpc.add("world", firstFunc);
			rpc.add("world", secondFunc);
			rpc.remove("world", firstFunc);
			assert.deepStrictEqual(rpc.list("world"), [secondFunc]);
		});
	});

	describe("making a request from client to server", () => {
		describe("when an action is found", () => {
			it("should execute the action and return a response to the client", () => {
				let responsePayload: string | null = null;

				const searchFunc = ({ id, data, reply }: RPCFunctionArgs) => {
					const entries = [
						"cat",
						"dog",
						"fish",
						"parrot",
						"cockatoo",
						"hamster",
						"mouse",
						"snake",
						"spider",
						"lizard",
					];
					const results = entries.filter((x) =>
						x.includes((data as { term: string }).term),
					);
					reply?.({
						id,
						action: "search",
						type: "response",
						data: { results },
					});
				};
				rpc.add("search", searchFunc);

				const id = uuidv4();

				const requestPayload = JSON.stringify({
					id,
					action: "search",
					type: "request",
					data: {
						term: "cat",
					},
				});

				const ws = {
					send: (payload) => {
						responsePayload = payload;
					},
				};

				rpc.receive({
					message: requestPayload,
					ws: ws as WebSocketWithClientId,
				});

				assert(responsePayload !== null, "Response payload should not be null");
				assert.deepStrictEqual(JSON.parse(responsePayload), {
					id,
					action: "search",
					type: "response",
					data: {
						results: ["cat"],
					},
				});
			});
		});

		describe("when an action is not found", () => {
			it("should return an error response if no corresponding action was found", () => {
				let responsePayload: string | null = null;

				const id = uuidv4();
				const requestPayload = JSON.stringify({
					id,
					action: "find",
					type: "request",
					data: {
						term: "cat",
					},
				});

				const ws = {
					send: (payload) => {
						responsePayload = payload;
					},
				};

				rpc.receive({
					message: requestPayload,
					ws: ws as WebSocketWithClientId,
				});
				assert(responsePayload !== null, "Response payload should not be null");

				assert.deepStrictEqual(JSON.parse(responsePayload), {
					id,
					action: "find",
					type: "error",
					error: "No server action found",
				});
			});
		});
	});

	describe("making a request from server to client", () => {
		describe("when an action is found", () => {
			it("should execute the action and return a response to the server", async () => {
				const hubServer = new Hub({ port: 4001 });
				hubServer.server.listen(4001);
				const terminator = createHttpTerminator({ server: hubServer.server });
				const hubClient = new HubClient({ url: "ws://localhost:4001" });
				hubClient.rpc.add("get-environment", ({ reply }) => {
					const { arch, platform, version } = process;
					reply?.({ data: { arch, platform, version } });
				});

				await hubClient.isReady();

				type RPCResponse = {
					arch: string;
					platform: string;
					version: string;
				};

				const ws = hubServer.wss.clients.values().next().value;
				const response = (await hubServer.rpc.send({
					ws,
					action: "get-environment",
				})) as RPCResponse;
				assert.strictEqual(response.arch, process.arch);
				assert.strictEqual(response.platform, process.platform);
				assert.strictEqual(response.version, process.version);
				await terminator.terminate();
			});
		});

		describe("when an action is not found", () => {
			it("should return an error response if no corresponding action was found", async () => {
				const hubServer = new Hub({ port: 4002 });
				hubServer.server.listen(4002);
				const terminator = createHttpTerminator({ server: hubServer.server });
				const hubClient = new HubClient({ url: "ws://localhost:4002" });
				await hubClient.isReady();
				const ws = hubServer.wss.clients.values().next().value;
				try {
					await hubServer.rpc.send({
						ws,
						action: "get-environment",
					});
					assert(false, "Should not execute this line");
				} catch (err) {
					assert.strictEqual(err, "No client action found");
				}
				await terminator.terminate();
			});
		});
	});

	describe("making a request without wanting a reply", () => {
		it("should make a request but not receive a reply", async () => {
			const hubServer = new Hub({ port: 4002 });
			hubServer.server.listen(4002);
			const terminator = createHttpTerminator({ server: hubServer.server });
			const hubClient = new HubClient({ url: "ws://localhost:4002" });
			hubClient.rpc.add("set-api-key", ({ data, reply }) => {
				assert.strictEqual((data as { apiKey: string }).apiKey, "xxx");
				reply?.({ data: { success: true, message: "api key set" } });
			});
			await hubClient.isReady();
			const ws = hubServer.wss.clients.values().next().value;
			const response = await hubServer.rpc.send({
				ws,
				action: "set-api-key",
				data: { apiKey: "xxx" },
				noReply: true,
			});
			assert.strictEqual(response, null);
			await delayUntil(() => hubServer.rpc.requests.length === 0);
			assert.strictEqual(hubServer.rpc.requests.length, 0);
			assert.strictEqual(hubServer.rpc.responses.length, 0);
			await terminator.terminate();
		});
	});
});
