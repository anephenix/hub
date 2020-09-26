const { Given, Then, When } = require('@cucumber/cucumber');
const {
	visitPage,
	clientIdRequested,
	clientRepliesWithNoClientId,
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

Given('a returning client opens a connection to the server', function () {
	// This is similar to the "a new client opens a connection to the server"
	// but the difference here is that the client will have visited before,
	// and this is a returning visitor to the same site, so we need a way to
	// perform that. Visit the page, get assigned a client id, then close the
	// page (but not the browser, then visit the page again)
	return 'pending';
});

When('the client replies with their client id', function () {
	// We need to write a bit of code on the server that captures the messages received from the client
	// and checks for messages replying with a client id
	return 'pending';
});

Then('the server should set that client id on the connection', function () {
	// We need to check the following:
	// - that the websocket connection on the server has a client id
	return 'pending';
});
