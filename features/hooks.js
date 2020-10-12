// Dependencies
const { BeforeAll, After, AfterAll } = require('@cucumber/cucumber');
const log = require('why-is-node-running');

const scope = require('./support/scope');
/*
	The web client is loaded here because it relies
	on async which the world.js file can't support
*/
const web = require('./support/client');

BeforeAll({timeout: 10000}, async () => {
	scope.web = await web.server();
});

After(async () => {
	if (scope.browser && scope.context.currentPage) {
		const cookies = await scope.context.currentPage.cookies();
		if (cookies && cookies.length > 0) {
			await scope.context.currentPage.deleteCookie(...cookies);
		}
		await scope.context.currentPage.close();
		// eslint-disable-next-line require-atomic-updates
		scope.context.currentPage = null;
		scope.clientPublishedMessage = null;
	}
});

AfterAll({timeout: 20000},async () => {
	try {
		if (scope.browser) await scope.browser.close();
		if (scope.otherClient) {
			scope.otherClient.sarus.disconnect();
		}
		await web.bundler.stop();
		await scope.web.close();
		scope.web.shutdown(() => console.log('\nWeb is shut down'));
		scope.api.shutdown(() => console.log('\nAPI is shut down'));
		setTimeout(log, 20000);
	} catch (err) {
		console.log({ err });
	}
});
