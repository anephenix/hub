// Dependencies
import assert from "node:assert";
import HubClient from "../../dist/esm/lib/client/HubClient.node.js";
import { scope } from "./scope.js";

let headless = false;
const slowMo = 5;
const ignoreHTTPSErrors = false;
// const args = ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'];

if (process.env.CI) {
	headless = "new";
}

const visitPage = async (pageUrl) => {
	if (!scope.browser)
		scope.browser = await scope.driver.launch({
			headless,
			slowMo,
			ignoreHTTPSErrors,
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		});

	scope.context.currentPage = await scope.browser.newPage();
	// Cater for admin urls
	const url = scope.host + pageUrl;
	const visit = await scope.context.currentPage.goto(url, {
		waitUntil: "networkidle2",
	});
	return visit;
};

const closePage = async () => {
	await scope.context.currentPage.close();
};

const clientIdRequested = async () => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (globalThis.sarusMessages.length === 0) return false;

		return globalThis.sarusMessages;
	});
	assert(JSON.parse(messages[0]).action === "get-client-id");
	assert(JSON.parse(messages[0]).type === "request");
};

const clientRepliesWithNoClientId = async () => {
	// Has to be 2 message back to pickup the get-client-id response,
	// as we also respond to setting a id
	const message = scope.messages[scope.messages.length - 2];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, "get-client-id");
	assert.strictEqual(parsedMessage.type, "response");
	assert.strictEqual(parsedMessage.data.clientId, null);
};

const clientRepliesWithAClientId = async () => {
	// Has to be 2 message back to pickup the get-client-id response,
	// as we also respond to setting a id
	const message = scope.messages[scope.messages.length - 2];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, "get-client-id");
	assert.strictEqual(parsedMessage.type, "response");
	assert(parsedMessage.data.clientId !== null);
	assert.strictEqual(parsedMessage.data.clientId.length, 36);
};

const serverSetsClientIdOnConnection = async () => {
	const clientId = Array.from(scope.hub.wss.clients)[0].clientId;
	assert(clientId !== undefined);
	return assert(clientId.length === 36);
};

const serverSendsClientIdToClient = async () => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { action, type, data } = JSON.parse(messages[messages.length - 1]);
	assert(action === "set-client-id");
	assert(type === "request");
	assert(data.clientId !== undefined);
	return assert(data.clientId.length === 36);
};

const clientSubscribesToChannel = async (channel) => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(async (channel) => {
		await hubClient.subscribe(channel);
	}, channel);
};

const serverReceivesSubscriptionRequest = async (channel) => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, "subscribe");
	assert.strictEqual(parsedMessage.data.channel, channel);
};

const serverReceivesUnsubscriptionRequest = async (channel) => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, "unsubscribe");
	assert.strictEqual(parsedMessage.data.channel, channel);
};

const getClientId = async () => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	const clientId = await currentPage.evaluate(() => {
		return localStorage.getItem("sarus-client-id");
	});
	return clientId;
};

// Checks that a client is subscribed to a channel
const serverSubscribesClientToChannel = ({ clientId, channel }) => {
	assert(scope.hub.pubsub.dataStore.clients[clientId].indexOf(channel) !== -1);
	assert(scope.hub.pubsub.dataStore.channels[channel].indexOf(clientId) !== -1);
};

const serverUnsubscribesClientFromChannel = ({ clientId, channel }) => {
	assert(scope.hub.pubsub.dataStore.clients[clientId].indexOf(channel) === -1);
	assert(scope.hub.pubsub.dataStore.channels[channel].indexOf(clientId) === -1);
};

const clientReceivesSubscribeSuccessReponse = async ({ clientId, channel }) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { data } = JSON.parse(messages[messages.length - 1]);
	assert(data.success === true);
	assert(
		data.message === `Client "${clientId}" subscribed to channel "${channel}"`,
	);
};

const publishMessageToChannel = async ({
	message,
	channel,
	excludeSender,
	server,
}) => {
	if (server) {
		await scope.hub.pubsub.publish({
			data: { channel, message },
		});
	} else {
		const { currentPage } = scope.context;
		scope.clientPublishedMessage = true;
		await currentPage.evaluate(
			async (channel, message, excludeSender) => {
				await hubClient.publish(channel, message, excludeSender);
			},
			channel,
			message,
			excludeSender,
		);
	}
};

const clientReceivesMessageForChannel = async ({ message, channel }) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	// Has to be 2 back if the client publishes the message themselves, or 1 if someone else (i.e. the server)
	const amount = scope.clientPublishedMessage ? 2 : 1;
	const { action, data } = JSON.parse(messages[messages.length - amount]);
	assert.strictEqual(action, "message");
	assert.strictEqual(data.channel, channel);
	assert.strictEqual(data.message, message);
};

const clientDoesNotReceiveMessageForChannel = async ({ message, channel }) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { action, data } = JSON.parse(messages[messages.length - 1]);
	if (!action && !data) return;
	assert.notStrictEqual(action, "message");
	assert.notStrictEqual(data.channel, channel);
	assert.notStrictEqual(data.message, message);
};

const clientUnsubscribesFromChannel = async (channel) => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(async (channel) => {
		await hubClient.unsubscribe(channel);
	}, channel);
};

const clientReceivesUnsubscribeSuccessReponse = async ({
	clientId,
	channel,
}) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { data } = JSON.parse(messages[messages.length - 1]);
	assert(data.success === true);
	assert(
		data.message ===
			`Client "${clientId}" unsubscribed from channel "${channel}"`,
	);
};

const otherClientSubscribesToChannel = async (channel) => {
	scope.otherClient = new HubClient({ url: "ws://localhost:3001" });
	scope.otherClientMessages = [];
	scope.otherClient.sarus.on("message", (message) =>
		scope.otherClientMessages.push(message.data),
	);
	await scope.otherClient.isReady();
	await scope.otherClient.subscribe(channel);
};

const otherClientReceivesMessageForChannel = async (message, channel) => {
	const lastMessage =
		scope.otherClientMessages[scope.otherClientMessages.length - 1];
	const parsedLastMessage = JSON.parse(lastMessage);
	assert.strictEqual(parsedLastMessage.data.message, message);
	assert.strictEqual(parsedLastMessage.data.channel, channel);
};

const rpcActionExistsOnServer = () => {
	if (scope.hub.rpc.list("hello")) return;
	const helloFunc = ({ reply }) => {
		reply({ data: "Hello to you too" });
	};
	scope.hub.rpc.add("hello", helloFunc);
};

const clientMakesHelloRPCRequest = async () => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(async () => {
		const request = {
			action: "hello",
		};

		console.log(window.hubClient);

		await hubClient.rpc.send(request);
	});
};

const clientReceivesHelloRPCReply = async () => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { action, type, data } = JSON.parse(messages[messages.length - 1]);
	assert.strictEqual(action, "hello");
	assert.strictEqual(type, "response");
	assert.strictEqual(data, "Hello to you too");
};

const clientMakesIncorrecRPCRequest = async () => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(async () => {
		const request = {
			action: "hi",
		};
		try {
			await hubClient.rpc.send(request);
		} catch (err) {
			// Do nothing
		}
	});
};

const clientReceivesIncorrectRPCReply = async () => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { action, type, error } = JSON.parse(messages[messages.length - 1]);
	assert.strictEqual(action, "hi");
	assert.strictEqual(type, "error");
	assert.strictEqual(error, "No server action found");
};

const rpcActionExistsOnClient = async () => {
	const { currentPage } = scope.context;
	await currentPage.evaluate(async () => {
		if (hubClient.rpc.list("time")) return;

		hubClient.rpc.add("time", ({ reply }) => {
			reply({ data: "The time is now" });
		});
	});
};

const serverMakesTimeRPCRequest = async () => {
	// Get the last item in the array
	const ws = Array.from(scope.hub.wss.clients).pop();
	try {
		await scope.hub.rpc.send({
			ws,
			action: "time",
		});
	} catch (err) {
		// Do nothing
	}
};
const serverReceivesTimeRPCReply = () => {
	const message = scope.messages[scope.messages.length - 1];
	const { action, type, data } = JSON.parse(message);
	assert.strictEqual(action, "time");
	assert.strictEqual(type, "response");
	assert.strictEqual(data, "The time is now");
};

const serverMakesIncorrecRPCRequest = async () => {
	// Get the last item in the array
	const ws = Array.from(scope.hub.wss.clients).pop();
	try {
		await scope.hub.rpc.send({
			ws,
			action: "clock",
		});
	} catch (err) {
		// Do nothing
	}
};
const serverReceivesIncorrectRPCReply = () => {
	const message = scope.messages[scope.messages.length - 1];
	const { action, type, error } = JSON.parse(message);
	assert.strictEqual(action, "clock");
	assert.strictEqual(type, "error");
	assert.strictEqual(error, "No client action found");
};

const addAuthenticatedChannelWithPassword = async (channel, password) => {
	const authenticate = async ({ data }) => {
		if (!data.password) throw new Error("Requires authentication");
		return data.password === password;
	};
	scope.hub.pubsub.addChannelConfiguration({ channel, authenticate });
};

const clientSubscribesToChannelWithPassword = async (channel, password) => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(
		async (channel, password) => {
			await hubClient.subscribe(channel, { password });
		},
		channel,
		password,
	);
};

const serverReceivesSubscriptionRequestWithPassword = async (
	channel,
	password,
) => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, "subscribe");
	assert.strictEqual(parsedMessage.data.channel, channel);
	assert.strictEqual(parsedMessage.data.password, password);
};

const serverMakesRequiresAuthenticationReply = async () => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		if (sarusMessages.length === 0) return false;

		return sarusMessages;
	});
	const { action, type, error } = JSON.parse(messages[messages.length - 1]);
	assert.strictEqual(action, "subscribe");
	assert.strictEqual(type, "error");
	assert.strictEqual(error, "Requires authentication");
};

const clientShouldNotBeSubscribedToChannel = async (channel) => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	const clientId = await currentPage.evaluate(async () => {
		await hubClient.getClientId();
	});
	const clients =
		await scope.hub.pubsub.dataStore.getClientIdsForChannel(channel);
	assert(!clients || clients.indexOf(clientId) === -1);
};

export {
	visitPage,
	closePage,
	clientIdRequested,
	clientRepliesWithNoClientId,
	serverSetsClientIdOnConnection,
	serverSendsClientIdToClient,
	clientRepliesWithAClientId,
	clientSubscribesToChannel,
	serverReceivesSubscriptionRequest,
	serverReceivesUnsubscriptionRequest,
	getClientId,
	serverSubscribesClientToChannel,
	serverUnsubscribesClientFromChannel,
	clientReceivesSubscribeSuccessReponse,
	publishMessageToChannel,
	clientReceivesMessageForChannel,
	clientDoesNotReceiveMessageForChannel,
	clientUnsubscribesFromChannel,
	clientReceivesUnsubscribeSuccessReponse,
	otherClientSubscribesToChannel,
	otherClientReceivesMessageForChannel,
	rpcActionExistsOnServer,
	clientMakesHelloRPCRequest,
	clientReceivesHelloRPCReply,
	clientMakesIncorrecRPCRequest,
	clientReceivesIncorrectRPCReply,
	rpcActionExistsOnClient,
	serverMakesTimeRPCRequest,
	serverReceivesTimeRPCReply,
	serverMakesIncorrecRPCRequest,
	serverReceivesIncorrectRPCReply,
	addAuthenticatedChannelWithPassword,
	clientSubscribesToChannelWithPassword,
	serverReceivesSubscriptionRequestWithPassword,
	serverMakesRequiresAuthenticationReply,
	clientShouldNotBeSubscribedToChannel,
};
