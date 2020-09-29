const { Given, Then, When } = require('@cucumber/cucumber');
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
	getClientId,
	serverSubscribesClientToChannel,
	clientReceivesSubscribeSuccessReponse,
	publishMessageToChannel,
	clientReceivesMessageForChannel,
} = require('../support/actions');

Given('pending', () => 'pending');

Given('a new client opens a connection to the server', async () => {
	await visitPage('/');
});

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
	async (channel) => {
		await serverReceivesSubscriptionRequest(channel);
	}
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
