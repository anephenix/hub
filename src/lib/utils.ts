/*
	This is used to detect whether the HubClient is 
	running in Node.js or the browser.
*/
const isNode = (): boolean =>
	typeof process !== 'undefined' &&
	process.versions != null &&
	process.versions.node != null;

export { isNode };
