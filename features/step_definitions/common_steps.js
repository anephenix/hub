const { Given, Then, When } = require('@cucumber/cucumber');
const { delay } = require('../../helpers/delay');
const {
	visitPage,
	closePage,
	clientIdRequested,
	clientRepliesWithNoClientId,
	clientRepliesWithAClientId,
	serverSetsClientIdOnConnection,
	serverSendsClientIdToClient,
	clientSubscribesToChannel,
	serverReceivesSubscriptionRequest,
	serverReceivesUnsubscriptionRequest,
	getClientId,
	serverSubscribesClientToChannel,
	clientReceivesSubscribeSuccessReponse,
	publishMessageToChannel,
	clientReceivesMessageForChannel,
	clientDoesNotReceiveMessageForChannel,
	clientUnsubscribesFromChannel,
	serverUnsubscribesClientFromChannel,
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
} = require('../support/actions');

Given('pending', () => 'pending');

Given(
	'a new client opens a connection to the server',
	{ timeout: 10000 },
	async () => {
		await visitPage('/');
	}
);

Then('the server should request the client id from the client', async () => {
	await clientIdRequested();
});

When('the client replies with no client id', async () => {
	await clientRepliesWithNoClientId();
});

Then(
	'the server should create a new client id, set it on the client connection, and send it to the client',
	async () => {
		await serverSetsClientIdOnConnection();
		await serverSendsClientIdToClient();
	}
);

Given('a returning client opens a connection to the server', async function () {
	await visitPage('/');
	await closePage();
	await visitPage('/');
});

When('the client replies with their client id', async () => {
	await clientRepliesWithAClientId();
});

Then('the server should set that client id on the connection', async () => {
	await serverSetsClientIdOnConnection();
});

Given('the client subscribes to the channel {string}', async (channel) => {
	await clientSubscribesToChannel(channel);
});

Then(
	'the server should receive a request to subscribe the client to the channel {string}',
	serverReceivesSubscriptionRequest
);

Then(
	'the server should subscribe the client to the channel {string}',
	async function (channel) {
		const clientId = await getClientId();
		return await serverSubscribesClientToChannel({ clientId, channel });
	}
);

Then(
	'the client should receive a reply indicating that they are now subscribed to the channel {string}',

	async function (channel) {
		const clientId = await getClientId();
		return await clientReceivesSubscribeSuccessReponse({
			clientId,
			channel,
		});
	}
);

When(
	'the client publishes the message {string} to the channel {string}',
	async function (message, channel) {
		return await publishMessageToChannel({ message, channel });
	}
);

Then(
	'the client should receive the message {string} for the channel {string}',
	async function (message, channel) {
		return await clientReceivesMessageForChannel({ message, channel });
	}
);

When(
	'the client publishes the message {string} to the channel {string} to all other subscribers',
	async function (message, channel) {
		return await publishMessageToChannel({
			message,
			channel,
			excludeSender: true,
		});
	}
);

Then(
	'the client should not receive the message {string} for the channel {string}',
	async function (message, channel) {
		return await clientDoesNotReceiveMessageForChannel({
			message,
			channel,
		});
	}
);

When(
	'the server publishes the message {string} to the channel {string}',
	async function (message, channel) {
		return await publishMessageToChannel({
			message,
			channel,
			server: true,
		});
	}
);

When(
	'the client unsubscribes from the channel {string}',
	async function (channel) {
		await clientUnsubscribesFromChannel(channel);
	}
);

Then(
	'the server should receive a request to unsubscribe the client from the channel {string}',
	async (channel) => {
		await serverReceivesUnsubscriptionRequest(channel);
	}
);

Then(
	'the server should unsubscribe the client from the channel {string}',
	async function (channel) {
		const clientId = await getClientId();
		return await serverUnsubscribesClientFromChannel({ clientId, channel });
	}
);

Then(
	'the client should receive a reply indicating that they are have unsubscribed from the channel {string}',
	async function (channel) {
		const clientId = await getClientId();
		return await clientReceivesUnsubscribeSuccessReponse({
			clientId,
			channel,
		});
	}
);

Given('I wait for {int} seconds', { timeout: 60000 }, async function (int) {
	await delay(int * 1000);
});

Then(
	'another client connects and subscribes to {string}',
	otherClientSubscribesToChannel
);

Then(
	'the other client should receive the message {string} for the channel {string}',
	otherClientReceivesMessageForChannel
);

Given('an RPC action exists on the server', rpcActionExistsOnServer);

When(
	'the client calls that RPC action on the server',
	clientMakesHelloRPCRequest
);

Then(
	'the client should receive a response from the server',
	clientReceivesHelloRPCReply
);

When(
	'the client calls the wrong RPC action on the server',
	clientMakesIncorrecRPCRequest
);

Then(
	'the client should receive an error response from the server saying that the action was not found',
	clientReceivesIncorrectRPCReply
);

Given('an RPC action exists on the client', rpcActionExistsOnClient);

When(
	'the server calls that RPC action on the client',
	serverMakesTimeRPCRequest
);

Then(
	'the server should receive a response from the client',
	serverReceivesTimeRPCReply
);

When(
	'the server calls the wrong RPC action on the client',
	serverMakesIncorrecRPCRequest
);

Then(
	'the server should receive an error response from the client saying that the action was not found',
	serverReceivesIncorrectRPCReply
);

Given(
	'the server has the channel {string} that requires authentication with the password {string}',
	addAuthenticatedChannelWithPassword
);

Given(
	'the client subscribes to the channel {string} with the password {string}',
	clientSubscribesToChannelWithPassword
);

Then(
	'the server should receive a request to subscribe the client to the channel {string} with the password {string}',
	serverReceivesSubscriptionRequestWithPassword
);

Then(
	'the server should reply with an error saying that the channel requires authentication',
	serverMakesRequiresAuthenticationReply
);

Then(
	'the client should not be subscribed to the channel {string}',
	clientShouldNotBeSubscribedToChannel
);
