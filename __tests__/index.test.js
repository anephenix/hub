const assert = require('assert');
const Hub = require('../index');

describe('Hub', () => {
	Hub;

	it('should return a class function', () => {
		assert.strictEqual(typeof Hub, 'function');
		assert(Hub instanceof Object);
		assert.strictEqual(
			Object.getOwnPropertyNames(Hub).includes('arguments'),
			false
		);
	});

	describe('an instance of Hub', () => {
		const hub = new Hub({ port: 4000 });
		it('should initialize a http server by default', () => {
			assert(hub.server);
		});
		it('should initialize a websocket server by default', () => {
			assert(hub.wss);
		});
		it.todo(
			'should attach event listener bindings to the websocket server'
		);
		describe('#listen', () => {
			it.todo('should listen on the given port');
		});
	});
});
