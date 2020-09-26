const { Given, Then, When } = require('@cucumber/cucumber');
const {
	visitPage,
	closePage,
	clientIdRequested,
	clientRepliesWithNoClientId,
	clientRepliesWithAClientId,
	serverSetsClientIdOnConnection,
	serverSendsClientIdToClient,
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
