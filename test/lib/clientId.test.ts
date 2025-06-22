import assert from "node:assert";
import { v4 as uuidv4 } from "uuid";
import { beforeAll, describe, it } from "vitest";
import { checkHasClientId, requestClientId } from "../../src/lib/clientId";
import RPC from "../../src/lib/rpc";
import type { WebSocketWithClientId } from "../../src/lib/types";

describe("clientId", () => {
	let rpc: RPC;
	let requestId: string;
	const messages: string[] = [];
	const nonClientMessages: string[] = [];
	let ws: WebSocketWithClientId;
	let nonClientWs: WebSocketWithClientId;
	let clientId: string;

	beforeAll(() => {
		rpc = new RPC();
		ws = {
			send: (message: string) => {
				messages.push(message);
				if (messages.length === 1) {
					const parsedMessage = JSON.parse(message);
					requestId = parsedMessage.id;
					clientId = uuidv4();
					const reply = {
						id: requestId,
						type: "response",
						action: "get-client-id",
						data: {
							clientId,
						},
					};
					rpc.receive({ message: JSON.stringify(reply), ws });
				}
			},
		} as WebSocketWithClientId;
		nonClientWs = {
			send: (message: string) => {
				nonClientMessages.push(message);
				const parsedMessage = JSON.parse(message);
				if (parsedMessage.action === "get-client-id") {
					requestId = parsedMessage.id;
					const reply = {
						id: requestId,
						type: "response",
						action: "get-client-id",
						data: {},
					};
					rpc.receive({ message: JSON.stringify(reply), ws });
				} else {
					// set-client-id
					requestId = parsedMessage.id;
					const reply = {
						id: requestId,
						type: "response",
						action: "set-client-id",
						data: { success: true },
					};
					rpc.receive({
						message: JSON.stringify(reply),
						ws: nonClientWs,
					});
				}
			},
		} as WebSocketWithClientId;
	});

	describe("requestClientId", () => {
		beforeAll(async () => {
			await requestClientId({ ws, rpc });
		});

		it("should send a message from the server to the client, asking for the client id", async () => {
			const lastMessage = messages[messages.length - 1];
			const parsedMessage = JSON.parse(lastMessage);
			assert.strictEqual(parsedMessage.action, "get-client-id");
			assert.strictEqual(parsedMessage.type, "request");
			assert.strictEqual(parsedMessage.id, requestId);
		});

		describe("if the client replies with a client id", () => {
			it("should assign the client id to the websocket", () => {
				assert.strictEqual(ws.clientId, clientId);
			});
		});

		describe("if the client replies with no client id", () => {
			it("should create a client id, assign it to the websocket, and send it to the client", async () => {
				await requestClientId({ ws: nonClientWs, rpc });
				const newClientId = nonClientWs.clientId;
				assert(newClientId);
				const lastMessage = nonClientMessages[nonClientMessages.length - 1];
				const parsedMessage = JSON.parse(lastMessage);
				assert.strictEqual(parsedMessage.action, "set-client-id");
				assert.strictEqual(parsedMessage.data.clientId, newClientId);
			});
		});
	});

	describe("#checkHasClientId", () => {
		describe("when the websocket has a clientId set", () => {
			it("should return true", async () => {
				let dataReceived: unknown;
				const socket = ws;
				const reply = ({ data }: { data: unknown }) => {
					dataReceived = data;
				};
				await checkHasClientId({ socket, reply });
				assert.strictEqual(
					(dataReceived as { hasClientId: boolean }).hasClientId,
					true,
				);
			});
		});

		describe("when the websocket does not have a clientId set", () => {
			it("should return false", async () => {
				let dataReceived: unknown;
				const socket = {} as WebSocketWithClientId;
				const reply = ({ data }: { data: unknown }) => {
					dataReceived = data;
				};
				await checkHasClientId({ socket, reply });
				assert.strictEqual(
					(dataReceived as { hasClientId: boolean }).hasClientId,
					false,
				);
			});
		});
	});
});
