// Dependencies
const { BeforeAll, After, AfterAll } = require('@cucumber/cucumber');
// const log = require('why-is-node-running');

const scope = require('./support/scope');
/*
	The web client is loaded here because it relies
	on async which the world.js file can't support
*/
const { startServer, stopServer } = require('./support/client');

BeforeAll({ timeout: 60000 }, async () => {
	await startServer();
});

After(async () => {
	if (scope.browser && scope.context.currentPage) {
		const cookies = await scope.context.currentPage.cookies();
		if (cookies?.length > 0) {
			await scope.context.currentPage.deleteCookie(...cookies);
		}
		await scope.context.currentPage.close();
		// eslint-disable-next-line require-atomic-updates
		scope.context.currentPage = null;
		scope.clientPublishedMessage = null;
	}
});

AfterAll({ timeout: 20000 }, async () => {
	try {
		if (scope.browser) await scope.browser.close();
		if (scope.otherClient) {
			scope.otherClient.sarus.disconnect();
		}
		scope.api.shutdown(() => console.log('\nAPI is shut down'));
		await stopServer();
		// setTimeout(log, 20000);
	} catch (err) {
		console.log({ err });
	}
});
