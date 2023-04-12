/**
 * Redis server helpers
 *
 * Will be used to start and stop redis server for tests and other purposes
 *
 * check if redis is running
 * if not, start it
 * run tests
 * stop redis (if started by this script)
 *
 */
const child_process = require('child_process');
const util = require('util');
const exec = util.promisify(child_process.exec);
const spawn = child_process.spawn;

const checkIfRedisIsRunning = async () => {
	try {
		const { stdout } = await exec('redis-cli ping');
		return stdout === 'PONG';
	} catch {
		return false;
	}
};

const startRedisServer = async () => {
	spawn('redis-server');
	return;
};

const stopRedisServer = async () => {
	return await exec('redis-cli shutdown');
};

const startRedisServerUnlessRunning = async () => {
	const isRunning = await checkIfRedisIsRunning();
	if (!isRunning) {
		await startRedisServer();
	}
};

const useRedisServer = async (callback) => {
	await startRedisServerUnlessRunning();
	console.log('Going');
	await callback();
	await stopRedisServer();
};

module.exports = {
	useRedisServer,
};
