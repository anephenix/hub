// Dependencies
import assert from "node:assert";
import { createHttpTerminator } from "http-terminator";
import { describe, it } from "vitest";
import { delayUntil } from "../../src/helpers/delay";
import Hub from "../../src/index";
import HubClient from "../../src/lib/client/HubClient.node";
import { checkIpAddress } from "../../src/lib/ipCheck";
import { getLocalInternalAddress } from "../helpers/utils";

describe("IP Address checking", () => {
	describe("when allowedIPAddresses is an empty array", () => {
		it("should not close the connection to block the client", async () => {
			const hub = new Hub({ port: 6001 });
			hub.server.listen(6001).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });
			const hubClient = new HubClient({ url: "ws://localhost:6001" });
			await hubClient.isReady();
			await delayUntil(() => {
				return (
					Array.from(hub.wss.clients).length === 1 &&
					hubClient.sarus.ws?.readyState === 1
				);
			});
			await terminator.terminate();
		});
	});

	describe("when ip address checking is enabled", () => {
		it("should disconnect any clients that attempt to connect from an ip address that is not in the allowed ip addresses list", async () => {
			const hub = new Hub({
				port: 6050,
				allowedIpAddresses: ["151.101.0.81"],
			});
			hub.server.listen(6050).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });
			const hubClient = new HubClient({ url: "ws://localhost:6050" });
			await delayUntil(() => {
				return (
					Array.from(hub.wss.clients).length === 0 &&
					hubClient.sarus.ws?.readyState === 3
				);
			});
			assert.strictEqual(Array.from(hub.wss.clients).length, 0);
			assert.strictEqual(hubClient.sarus.ws?.readyState, 3);
			await terminator.terminate();
		});

		it("should only allow clients to connect if they have an allowed ip address", async () => {
			const ipAddress = getLocalInternalAddress();
			// Added this for Github Actions IPv6 localhost support
			const localLoopbackAddress = "::1";
			const allowedIpAddresses = [ipAddress, localLoopbackAddress];
			const hub = new Hub({
				port: 8001,
				allowedIpAddresses,
			});
			hub.server.listen(8001).on("error", (err) => {
				throw err;
			});
			const terminator = createHttpTerminator({ server: hub.server });
			const hubClient = new HubClient({ url: "ws://localhost:8001" });
			await hubClient.isReady();
			await delayUntil(() => {
				return (
					Array.from(hub.wss.clients).length === 1 &&
					hubClient.sarus.ws?.readyState === 1
				);
			});
			assert.strictEqual(Array.from(hub.wss.clients).length, 1);
			assert.strictEqual(hubClient.sarus.ws?.readyState, 1);
			await terminator.terminate();
		});
	});

	describe("#checkIpAddress()", () => {
		describe("when there are no allowed ip addresses", () => {
			it("should return true", () => {
				assert.strictEqual(checkIpAddress(undefined, "127.0.0.1"), true);
				assert.strictEqual(checkIpAddress([], "127.0.0.1"), true);
			});
		});

		describe("when there are allowed ip addresses", () => {
			it("should return true if the ip address is in the allowed ip addresses list", () => {
				const allowedIpAddresses = ["127.0.0.1", "::1"];
				assert.strictEqual(
					checkIpAddress(allowedIpAddresses, "127.0.0.1"),
					true,
				);
				assert.strictEqual(checkIpAddress(allowedIpAddresses, "::1"), true);
			});

			it("should return false if the ip address is not in the allowed ip addresses list", () => {
				const allowedIpAddresses = ["127.0.0.1", "::1"];
				assert.strictEqual(
					checkIpAddress(allowedIpAddresses, "192.168.1.1"),
					false,
				);
			});
		});
	});
});
