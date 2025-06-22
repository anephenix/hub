// Dependencies
import assert from "node:assert";
import { createHttpTerminator } from "http-terminator";
import { describe, it } from "vitest";
import { delayUntil } from "../../src/helpers/delay";
import { Hub } from "../../src/index";
import HubClient from "../../src/lib/client/HubClient.node";

describe("Origin checking", () => {
	describe("when allowedOrigins is an empty array", () => {
		it("should not close the connection to block the client", async () => {
			const hub = new Hub({ port: 6000 });
			await hub.server.listen(6000).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });
			const hubClient = new HubClient({ url: "ws://localhost:6000" });
			await hubClient.isReady();
			await delayUntil(async () => Array.from(hub.wss.clients).length === 1, 1);
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			await terminator.terminate();
		});
	});

	describe("when origin checking is enabled", () => {
		it("should disconnect any clients that attempt to connect from an origin that is not in the allowed origins list", async () => {
			/* 
				Wacom tablet was listening on port 7000 - need to check that ports we use for unit tests are not in use
			*/
			const hub = new Hub({ port: 7001, allowedOrigins: ["localhost:4000"] });
			hub.server.listen(7001).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });
			const hubClient = new HubClient({ url: "ws://localhost:7001" });
			await delayUntil(
				() => (hubClient.sarus.ws as WebSocket).readyState === 3,
			);
			assert.strictEqual(Array.from(hub.wss.clients).length, 0);
			assert.strictEqual((hubClient.sarus.ws as WebSocket).readyState, 3);
			await terminator.terminate();
		});

		it("should only allow clients to connect if they have an allowed origin", async () => {
			const hub = new Hub({ port: 8000, allowedOrigins: ["localhost:8000"] });
			await hub.server.listen(8000).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });
			const hubClient = new HubClient({ url: "ws://localhost:8000" });
			await hubClient.isReady();
			await delayUntil(async () => Array.from(hub.wss.clients).length === 1, 1);
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			assert.strictEqual((hubClient.sarus.ws as WebSocket).readyState, 1);
			await terminator.terminate();
		});
	});
});
