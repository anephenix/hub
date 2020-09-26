// Dependencies
const { BeforeAll, After, AfterAll } = require('@cucumber/cucumber');
const scope = require('./support/scope');
/*
	The web client is loaded here because it relies
	on async which the world.js file can't support
*/
const web = require('./support/client');

BeforeAll(async () => {
	const loaded = await web.server();
	scope.web = loaded;
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
	}
});

AfterAll(async () => {
	try {
		if (scope.browser) await scope.browser.close();
		scope.api.shutdown(() => console.log('\nAPI is shut down'));
		scope.web.shutdown(() => console.log('\nWeb is shut down'));
		await web.bundler.stop();
	} catch (err) {
		console.log({ err });
	}
});
