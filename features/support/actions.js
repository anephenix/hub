// Dependencies
const assert = require('assert');
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
		if (sarusMessages.length === 0) return false;
		// eslint-disable-next-line no-undef
		return sarusMessages;
	});
	assert(JSON.parse(messages[0]).action === 'request-client-id');
};

const clientRepliesWithNoClientId = async () => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, 'reply-client-id');
	assert.strictEqual(parsedMessage.data.clientId, null);
};

const clientRepliesWithAClientId = async () => {
	const message = scope.messages[scope.messages.length - 1];
	const parsedMessage = JSON.parse(message);
	assert.strictEqual(parsedMessage.action, 'reply-client-id');
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
	const { action, data } = JSON.parse(messages[messages.length - 1]);
	assert(action === 'set-client-id');
	assert(data.clientId !== undefined);
	return assert(data.clientId.length === 36);
};

module.exports = {
	visitPage,
	closePage,
	clientIdRequested,
	clientRepliesWithNoClientId,
	serverSetsClientIdOnConnection,
	serverSendsClientIdToClient,
	clientRepliesWithAClientId,
};
