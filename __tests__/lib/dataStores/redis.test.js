// Dependencies
// const assert = require('assert');
// const RedisDataStore = require('../../../lib/dataStores/redis');

describe('redis data store', () => {
	it.todo('should initialise with a redis client');

	describe('#addItemToCollection', () => {
		describe('when the key does not exist on the hash', () => {
			it.todo(
				'should set the hash key to an array containing the passed value'
			);
		});

		describe('when the key exists on the hash', () => {
			it.todo(
				'should append the value to the existing values of the hash key'
			);
		});
	});

	describe('#removeItemFromCollection', () => {
		it.todo('should remove the value from the values of the hash key');
	});

	describe('#addClientToChannel', () => {
		it.todo(
			'should add the clientID value to the channel key in the channels hash'
		);
		it.todo(
			'should add the channel value to the clientId key in the clients hash'
		);
	});

	describe('#removeClientFromChannel', () => {
		it.todo(
			'should remove the clientID value from the channel key in the channels hash'
		);
		it.todo(
			'should remove the channel value from the clientId key in the clients hash'
		);
	});

	describe('#getClientIdsForChannel', () => {
		it.todo(
			'should return the client ids that are subscribed to a channel'
		);
	});

	describe('#getChannelsForClientId', () => {
		it.todo('should return the channels that a clientId has subscribed to');
	});
});
