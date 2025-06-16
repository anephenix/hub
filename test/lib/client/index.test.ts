// Dependencies
import assert from "node:assert";
import { Hub, HubClient } from "../../../src/index";
import { createHttpTerminator } from "http-terminator";
import { delay, delayUntil } from "../../../src/helpers/delay";
import { decode } from "../../../src/lib/dataTransformer";
import { describe, it, beforeAll, afterAll } from "vitest";

describe("Client library", () => {
	let hub: InstanceType<typeof Hub>;
	let terminator: ReturnType<typeof createHttpTerminator>;
	let hubClient: InstanceType<typeof HubClient>;

	beforeAll(async () => {
		hub = new Hub({ port: 5001 });
		hub.server.listen(5001).on("error", (err) => {
			throw err;
		});
		terminator = createHttpTerminator({ server: hub.server });
		hubClient = new HubClient({ url: "ws://localhost:5001" });
		await hubClient.isReady();
	});

	afterAll(() => {
		terminator.terminate();
	});

	describe("#addChannelMessageHandler", () => {
		it("should add a function to call when a message is received for a channel", async () => {
			await hubClient.subscribe("news");
			let handlerFunctionCalled = false;
			let messageReceived: any = null;
			const handlerFunction = (message: any) => {
				messageReceived = message;
				handlerFunctionCalled = true;
			};
			hubClient.addChannelMessageHandler("news", handlerFunction);
			await hub.pubsub.publish({
				data: {
					channel: "news",
					message: {
						title:
							"Sadio Mane: Liverpool forward isolating after positive coronavirus test",
						url: "http://bbc.co.uk/sport/football/54396525",
					},
				},
			});
			await delayUntil(() => handlerFunctionCalled);
			assert.strictEqual(
				messageReceived.title,
				"Sadio Mane: Liverpool forward isolating after positive coronavirus test",
			);
			assert.strictEqual(
				messageReceived.url,
				"http://bbc.co.uk/sport/football/54396525",
			);
		});
	});

	describe("#removeChannelMessageHandler", () => {
		describe("when passing a function variable", () => {
			it("should remove a function from being called when a message is received for a channel", () => {
				const anotherHandlerFunction = () => {};
				hubClient.addChannelMessageHandler("weather", anotherHandlerFunction);
				assert.deepStrictEqual(hubClient.channelMessageHandlers.weather, [
					anotherHandlerFunction,
				]);
				hubClient.removeChannelMessageHandler(
					"weather",
					anotherHandlerFunction,
				);
				assert.deepStrictEqual(hubClient.channelMessageHandlers.weather, []);
			});
		});

		describe("when passing a function name", () => {
			it("should remove a function from being called when a message is received for a channel", () => {
				function yetAnotherHandlerFunction() {}
				hubClient.addChannelMessageHandler("sport", yetAnotherHandlerFunction);
				assert.deepStrictEqual(hubClient.channelMessageHandlers.sport, [
					yetAnotherHandlerFunction,
				]);
				hubClient.removeChannelMessageHandler(
					"sport",
					"yetAnotherHandlerFunction",
				);
				assert.deepStrictEqual(hubClient.channelMessageHandlers.sport, []);
			});
		});

		describe("when passing an invalid function variable or name", () => {
			it("should throw an error stating that the function was not found for that channel", () => {
				const anotherHandlerFunction = () => {};
				assert.throws(
					() => {
						hubClient.removeChannelMessageHandler(
							"weather",
							anotherHandlerFunction,
						);
					},
					{ message: 'Function not found for channel "weather"' },
				);
				assert.throws(
					() => {
						hubClient.removeChannelMessageHandler(
							"sport",
							"yetAnotherHandlerFunction",
						);
					},
					{ message: 'Function not found for channel "sport"' },
				);
			});
		});
	});

	describe("#listChannelMessageHandlers", () => {
		const anotherHandlerFunction = () => {};
		function yetAnotherHandlerFunction() {}

		beforeAll(() => {
			hubClient.addChannelMessageHandler("weather", anotherHandlerFunction);
			hubClient.addChannelMessageHandler("sport", yetAnotherHandlerFunction);
		});

		describe("when a channel is passed", () => {
			it("should list all of the message handlers for a channel", () => {
				const sportChannelMessageHandlers =
					hubClient.listChannelMessageHandlers("sport");
				assert.deepStrictEqual(sportChannelMessageHandlers, [
					yetAnotherHandlerFunction,
				]);
			});

			describe("when no handlers have ever been set on a channel ever", () => {
				it("should return null", () => {
					const entertainmentChannelMessageHandlers =
						hubClient.listChannelMessageHandlers("entertainment");
					assert.strictEqual(entertainmentChannelMessageHandlers, null);
				});
			});
		});

		describe("when no channel is passed", () => {
			it("should return all of the message handlers for all channels", () => {
				const channelMessageHandlers = hubClient.listChannelMessageHandlers();
				assert.deepStrictEqual(
					channelMessageHandlers,
					hubClient.channelMessageHandlers,
				);
			});
		});
	});

	describe("#subscribe", () => {
		it("should subscribe to a channel", async () => {
			// Subscribe the client to a channel
			const subscribe = await hubClient.subscribe("business");
			assert(subscribe.success);
			const clientId = global.localStorage.getItem("sarus-client-id");
			// assert that the hub server has that client noted as a subscriber to that channel
			assert(hub.pubsub.dataStore.channels.business.indexOf(clientId) !== -1);
		});

		it("should add the channel to the list of channels", () => {
			assert(hubClient.channels.indexOf("business") !== -1);
		});

		describe("when options are passed", () => {
			it("should pass those options into the data payload for the rpc request", async () => {
				const messages: any[] = [];
				hub.rpc.add("subscribe", ({ data }: { data: any }) => {
					messages.push(data);
				});
				await hubClient.subscribe("cats", { password: "tuna" });
				const lastMessage = messages[messages.length - 1];
				assert.strictEqual(lastMessage.password, "tuna");
				await hubClient.unsubscribe("cats");
			});
		});
	});

	describe("#unsubscribe", () => {
		it("should unsubscribe from a channel", async () => {
			// Subscribe the client to a channel
			const subscribe = await hubClient.subscribe("markets");
			assert(subscribe.success);
			const clientId = global.localStorage.getItem("sarus-client-id");
			// assert that the hub server has that client noted as a subscriber to that channel
			assert(hub.pubsub.dataStore.channels.markets.indexOf(clientId) !== -1);
			const unsubscribe = await hubClient.unsubscribe("markets");
			assert(unsubscribe.success);
			assert(hub.pubsub.dataStore.channels.markets.indexOf(clientId) === -1);
		});

		it("should remove the channel from the list of channels", () => {
			assert(hubClient.channels.indexOf("markets") === -1);
		});
	});

	describe("#publish", () => {
		it("should publish a message to a channel", async () => {
			await hubClient.subscribe("culture");
			let handlerFunctionCalled = false;
			let messageReceived: any = null;
			const handlerFunction = (message: any) => {
				messageReceived = message;
				handlerFunctionCalled = true;
			};
			hubClient.addChannelMessageHandler("culture", handlerFunction);
			await hubClient.publish("culture", { title: "Dune film delayed" });
			await delayUntil(() => handlerFunctionCalled);
			assert.strictEqual(messageReceived.title, "Dune film delayed");
		});
		it("should publish a message to a channel, but exclude the sender if they are also a subscribe but wish to not receive the message themselves", async () => {
			await hubClient.subscribe("arts");
			let handlerFunctionCalled = false;
			let messageReceived: any = null;
			const handlerFunction = (message: any) => {
				messageReceived = message;
				handlerFunctionCalled = true;
			};
			hubClient.addChannelMessageHandler("arts", handlerFunction);
			await hubClient.publish(
				"arts",
				{
					title: "Booker prize nominees list revealed",
				},
				true,
			);
			assert(!handlerFunctionCalled);
			assert.notDeepStrictEqual(messageReceived, {
				title: "Booker prize nominees list revealed",
			});
		});
	});

	describe("#addChannel", () => {
		const channel = "tunnel";
		it("should add the channel to the list of channels subscribed to", () => {
			hubClient.addChannel(channel);
			assert.deepStrictEqual(hubClient.channels, [
				"news",
				"business",
				"culture",
				"arts",
				channel,
			]);
		});
		it("should add the channel only once in case it has already been added before", () => {
			hubClient.addChannel(channel);
			assert.deepStrictEqual(hubClient.channels, [
				"news",
				"business",
				"culture",
				"arts",
				channel,
			]);
		});
		it("should also store options if they are passed", () => {
			const opts = { token: "d028hd020j1d0j" };
			hubClient.removeChannel(channel);
			hubClient.addChannel(channel, opts);
			assert.deepStrictEqual(hubClient.channels, [
				"news",
				"business",
				"culture",
				"arts",
				channel,
			]);
			assert.deepStrictEqual(hubClient.channelOptions[channel], opts);
		});
	});

	describe("#removeChannel", () => {
		const channel = "tunnel";
		it("should remove the channel from the list of channels subscribed to", () => {
			hubClient.removeChannel(channel);
			assert.deepStrictEqual(hubClient.channels, [
				"news",
				"business",
				"culture",
				"arts",
			]);
		});
		it("should remove the channel only once in case it has already been removed before", () => {
			hubClient.removeChannel(channel);
			assert.deepStrictEqual(hubClient.channels, [
				"news",
				"business",
				"culture",
				"arts",
			]);
		});

		it("should also remove any options that were stored for that channel", () => {
			const opts = { token: "d028hd020j1d0j" };
			hubClient.addChannel(channel, opts);
			hubClient.removeChannel(channel);
			assert.deepStrictEqual(hubClient.channels, [
				"news",
				"business",
				"culture",
				"arts",
			]);
			assert.deepStrictEqual(hubClient.channelOptions[channel], null);
		});
	});

	describe("#resubscribeOnReconnect", () => {
		describe("when the client has no channel subscriptions", () => {
			it("should not ask the server if the websocket connection has a client id set", async () => {
				const messages: any[] = [];
				const newHubClient = new HubClient({
					url: "ws://localhost:5001",
				});
				newHubClient.sarus.on("message", (event: any) => {
					messages.push(decode(event.data));
				});
				newHubClient.sarus.disconnect();
				await delay(100);
				await newHubClient.resubscribeOnReconnect();
				assert.strictEqual(
					messages.map((m: any) => m.action).indexOf("has-client-id"),
					-1,
				);
			});
		});

		describe("when the client has channel subscriptions", () => {
			const messages: any[] = [];
			const newHubClient = new HubClient({
				url: "ws://localhost:5001",
				clientIdKey: "another-sarus-client-id",
			});
			newHubClient.sarus.on("message", (event: any) => {
				messages.push(decode(event.data));
			});
			beforeAll(async () => {
				await newHubClient.isReady();
				newHubClient.addChannel("dogs");
				await newHubClient.resubscribeOnReconnect();
			});

			it("should ask the server if the websocket connection has a client id set", async () => {
				await delayUntil(() => {
					return (
						messages.map((m: any) => m.action).indexOf("has-client-id") !== -1
					);
				});
			});
			it("should resubscribe to all of the client channels", async () => {
				const clientId = newHubClient.getClientId();
				const channels =
					await hub.pubsub.dataStore.getChannelsForClientId(clientId);
				assert.deepStrictEqual(channels, ["dogs"]);
			});
		});

		describe("when the client has channel subscriptions that require authentication", () => {
			it("should resubscribe to those channels too", async () => {
				const channel = "cheeses";
				const authenticate = ({ data }: { data: any }) => {
					return data.password === "brie";
				};
				hub.pubsub.addChannelConfiguration({ channel, authenticate });
				const anotherHubClient = new HubClient({
					url: "ws://localhost:5001",
					clientIdKey: "one-more-sarus-client-id",
				});
				await anotherHubClient.isReady();
				await anotherHubClient.subscribe(channel, { password: "brie" });
				await delay(100);
				const channels = await hub.pubsub.dataStore.getChannelsForClientId(
					anotherHubClient.getClientId(),
				);
				assert(channels?.indexOf(channel) !== -1);
				anotherHubClient.sarus.disconnect();
				await delay(100);
				anotherHubClient.sarus.reconnect();
				await delay(1200);
				const freshChannels = await hub.pubsub.dataStore.getChannelsForClientId(
					anotherHubClient.getClientId(),
				);
				assert(freshChannels?.indexOf(channel) !== -1);
				await anotherHubClient.unsubscribe(channel);
			});
		});
	});

	describe("when the client reconnects to the server", () => {
		const messages: any[] = [];
		let newHubClient: InstanceType<typeof HubClient>;
		const channelOne = "baseball-game-x";
		const channelTwo = "baseball-game-y";

		beforeAll(async () => {
			newHubClient = new HubClient({
				url: "ws://localhost:5001",
				clientIdKey: "yet-another-sarus-client-id",
			});
			newHubClient.sarus.on("message", (event: any) => {
				messages.push(decode(event.data));
			});
			await newHubClient.isReady();
			await newHubClient.subscribe(channelOne);
			await newHubClient.subscribe(channelTwo);
			assert.deepStrictEqual(newHubClient.channels, [channelOne, channelTwo]);
			const channels = await hub.pubsub.dataStore.getChannelsForClientId(
				newHubClient.getClientId(),
			);
			assert.deepStrictEqual(channels, [channelOne, channelTwo]);
			newHubClient.sarus.disconnect();
			await delay(50);
			newHubClient.sarus.reconnect();
			await delayUntil(() => {
				return (
					messages.map((m: any) => m.action).indexOf("has-client-id") !== -1
				);
			});
		});

		describe("and the client has subscriptions", () => {
			it("should check that the server has a clientId set for the webSocket", async () => {
				await delayUntil(() => {
					return (
						messages.map((m: any) => m.action).indexOf("has-client-id") !== -1
					);
				});
			});
			it("should then resubscribe the client to their channels", async () => {
				const clientId = newHubClient.getClientId();
				await delayUntil(async () => {
					const channels =
						await hub.pubsub.dataStore.getChannelsForClientId(clientId);
					return channels.length === 2;
				});
				const channels =
					await hub.pubsub.dataStore.getChannelsForClientId(clientId);
				assert.strictEqual(channels.length, 2);
				assert(channels.indexOf(channelOne) > -1);
				assert(channels.indexOf(channelTwo) > -1);
			});
		});

		describe("and the client does not have subscriptions", () => {
			const otherMessages: any[] = [];
			let otherHubClient: InstanceType<typeof HubClient>;

			beforeAll(async () => {
				otherHubClient = new HubClient({
					url: "ws://localhost:5001",
					clientIdKey: "other-sarus-client-id",
				});
				otherHubClient.sarus.on("message", (event: any) => {
					otherMessages.push(decode(event.data));
				});
				await otherHubClient.isReady();
				otherHubClient.sarus.disconnect();
				await delay(50);
				otherHubClient.sarus.reconnect();
			});

			it("should not check that the server has a clientId set for the webSocket", async () => {
				await delay(1100);
				assert(
					otherMessages.map((m: any) => m.action).indexOf("has-client-id") ===
						-1,
				);
			});
		});
	});
});
