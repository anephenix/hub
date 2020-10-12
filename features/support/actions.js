// Dependencies
const assert = require('assert');
const { delayUntil } = require('../../helpers/delay');
const { HubClient } = require('../../index');
const scope = require('./scope');

let headless = false;
let slowMo = 5;
let ignoreHTTPSErrors = false;
const args = ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'];

const visitPage = async (pageUrl) => {
	if (!scope.browser)
		// eslint-disable-next-line require-atomic-updates
		scope.browser = await scope.driver.launch({
			headless,
			slowMo,
			ignoreHTTPSErrors,
			args,
		});

	// NOTE - Puppeteer 1.10.0 breaks on this line - fixed on 1.9.0 for that reason
	// eslint-disable-next-line require-atomic-updates
	scope.context.currentPage = await scope.browser.newPage();
	// Cater for admin urls
	let url;
	url = scope.host + pageUrl;
	const visit = await scope.context.currentPage.goto(url, {
		waitUntil: 'networkidle2',
	});
	return visit;
};

const closePage = async () => {
	await scope.context.currentPage.close();
};

const clientIdRequested = async () => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		// eslint-disable-next-line no-undef
		if (globalThis.sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return globalThis.sarusMessages;
	});
	assert(JSON.parse(messages[0]).action === 'get-client-id');
	assert(JSON.parse(messages[0]).type === 'request');
};

const clientRepliesWithNoClientId = async () => {
	// Has to be 2 message back to pickup the get-client-id response,
	// as we also respond to setting a id
	const message = scope.messages[scope.messages.length - 2];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, 'get-client-id');
	assert.strictEqual(parsedMessage.type, 'response');
	assert.strictEqual(parsedMessage.data.clientId, null);
};

const clientRepliesWithAClientId = async () => {
	// Has to be 2 message back to pickup the get-client-id response,
	// as we also respond to setting a id
	const message = scope.messages[scope.messages.length - 2];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, 'get-client-id');
	assert.strictEqual(parsedMessage.type, 'response');
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
		// eslint-disable-next-line no-undef
		if (sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return sarusMessages;
	});
	const { action, type, data } = JSON.parse(messages[messages.length - 1]);
	assert(action === 'set-client-id');
	assert(type === 'request');
	assert(data.clientId !== undefined);
	return assert(data.clientId.length === 36);
};

const clientSubscribesToChannel = async (channel) => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(async (channel) => {
		// eslint-disable-next-line no-undef
		await hubClient.subscribe(channel);
	}, channel);
};

const serverReceivesSubscriptionRequest = async (channel) => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, 'subscribe');
	assert.strictEqual(parsedMessage.data.channel, channel);
};

const serverReceivesUnsubscriptionRequest = async (channel) => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, 'unsubscribe');
	assert.strictEqual(parsedMessage.data.channel, channel);
};

const getClientId = async () => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	const clientId = await currentPage.evaluate(() => {
		// eslint-disable-next-line no-undef
		return localStorage.getItem('sarus-client-id');
	});
	return clientId;
};

// Checks that a client is subscribed to a channel
const serverSubscribesClientToChannel = ({ clientId, channel }) => {
	assert(scope.hub.pubsub.clients[clientId].indexOf(channel) !== -1);
	assert(scope.hub.pubsub.channels[channel].indexOf(clientId) !== -1);
};

const serverUnsubscribesClientFromChannel = ({ clientId, channel }) => {
	assert(scope.hub.pubsub.clients[clientId].indexOf(channel) === -1);
	assert(scope.hub.pubsub.channels[channel].indexOf(clientId) === -1);
};

const clientReceivesSubscribeSuccessReponse = async ({ clientId, channel }) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		// eslint-disable-next-line no-undef
		if (sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return sarusMessages;
	});
	const { data } = JSON.parse(messages[messages.length - 1]);
	assert(data.success === true);
	assert(
		data.message === `Client "${clientId}" subscribed to channel "${channel}"`
	);
};

const publishMessageToChannel = async ({
	message,
	channel,
	excludeSender,
	server,
}) => {
	if (server) {
		scope.hub.pubsub.publish({
			data: { channel, message },
		});
	} else {
		const { currentPage } = scope.context;
		scope.clientPublishedMessage = true;
		await currentPage.evaluate(
			async (channel, message, excludeSender) => {
				// eslint-disable-next-line no-undef
				await hubClient.publish(channel, message, excludeSender);
			},
			channel,
			message,
			excludeSender
		);
	}
};

const clientReceivesMessageForChannel = async ({ message, channel }) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		// eslint-disable-next-line no-undef
		if (sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return sarusMessages;
	});
	// Has to be 2 back if the client publishes the message themselves, or 1 if someone else (i.e. the server)
	const amount = scope.clientPublishedMessage ? 2 : 1;
	const { action, data } = JSON.parse(messages[messages.length - amount]);
	assert.strictEqual(action, 'message');
	assert.strictEqual(data.channel, channel);
	assert.strictEqual(data.message, message);
};

const clientDoesNotReceiveMessageForChannel = async ({ message, channel }) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		// eslint-disable-next-line no-undef
		if (sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return sarusMessages;
	});
	const { action, data } = JSON.parse(messages[messages.length - 1]);
	if (!action && !data) return;
	assert.notStrictEqual(action, 'message');
	assert.notStrictEqual(data.channel, channel);
	assert.notStrictEqual(data.message, message);
};

const clientUnsubscribesFromChannel = async (channel) => {
	const { currentPage } = scope.context;
	// We need to make a request from the client to the server to subscribe to a channel
	await currentPage.evaluate(async (channel) => {
		// eslint-disable-next-line no-undef
		await hubClient.unsubscribe(channel);
	}, channel);
};

const clientReceivesUnsubscribeSuccessReponse = async ({
	clientId,
	channel,
}) => {
	const { currentPage } = scope.context;
	const messages = await currentPage.evaluate(() => {
		// eslint-disable-next-line no-undef
		if (sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return sarusMessages;
	});
	const { data } = JSON.parse(messages[messages.length - 1]);
	assert(data.success === true);
	assert(
		data.message ===
			`Client "${clientId}" unsubscribed from channel "${channel}"`
	);
};

const otherClientSubscribesToChannel = async (channel) => {
	const sarusConfig = { url: 'ws://localhost:3001', retryConnectionDelay: true };
	scope.otherClient = new HubClient({ sarusConfig });
	scope.otherClientMessages = [];
	scope.otherClient.sarus.on('message', message => scope.otherClientMessages.push(message.data));
	await delayUntil(() => {
		return scope.otherClient.sarus.ws.readyState === 1;
	}, 5000);
	await delayUntil(() => { return global.localStorage.getItem('sarus-client-id') !== undefined; }, 5000);
	await scope.otherClient.subscribe(channel);
};

const otherClientReceivesMessageForChannel = async (message, channel) => {
	const lastMessage = scope.otherClientMessages[scope.otherClientMessages.length - 1];
	const parsedLastMessage = JSON.parse(lastMessage);
	assert.strictEqual(parsedLastMessage.data.message, message);
	assert.strictEqual(parsedLastMessage.data.channel, channel);
};

module.exports = {
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
};
