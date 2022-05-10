const { Parcel } = require('@parcel/core');
const bundler = new Parcel({
	entries: './features/support/client/index.html',
	serveOptions: {
		port: 3000,
	},
	hmrOptions: {
		port: 3000,
	},
});

const main = async () => {
	return await bundler.watch();
};

const server = async () => {
	const s = await main();
	return s;
};
module.exports = { main, server, bundler };
