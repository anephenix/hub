const httpShutdown = require('http-shutdown');
const Bundler = require('parcel-bundler');
const bundler = new Bundler(['./features/support/client/index.html'], {
	name: 'serve',
	target: 'browser',
});

const main = async () => {
	const server = await bundler.serve(3000, false, 'localhost');
	return server;
};

const server = async () => {
	const s = await main();
	return httpShutdown(s);
};
module.exports = { main, server, bundler };