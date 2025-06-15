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
import { exec as execCb, spawn } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCb);

const checkIfRedisIsRunning = async (): Promise<boolean> => {
	try {
		const { stdout } = await exec("redis-cli ping");
		return stdout.trim() === "PONG";
	} catch {
		return false;
	}
};

const startRedisServer = async (): Promise<void> => {
	spawn("redis-server", { stdio: "ignore", detached: true });
	return;
};

const stopRedisServer = async (): Promise<void> => {
	await exec("redis-cli shutdown");
};

const startRedisServerUnlessRunning = async (): Promise<void> => {
	const isRunning = await checkIfRedisIsRunning();
	if (!isRunning) await startRedisServer();
};

/*
	This is used to ensure that the Redis server is running before executing 
	a callback (such as to run a test suite).
*/
export const useRedisServer = async (
	callback: () => Promise<void> | void,
): Promise<void> => {
	await startRedisServerUnlessRunning();
	await callback();
	await stopRedisServer();
};
