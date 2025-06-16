/*
	Validators
	----------

	This is a collection of utility functions that help prevent the developer
	from providing invalid configuration settings when using the library.

*/
import type { ServerEventListeners, ConnectionEventListeners } from "./types";

// Checks if a parameter passed is not an object
const isNotAnObject = (parameter: unknown): boolean => {
	if (Array.isArray(parameter)) return true;
	return !(parameter instanceof Object);
};

const checkAreFunctions = ({
	object,
	key,
}: { object: { [key: string]: unknown }; key: string }) => {
	const arrayItemTypes = [
		...new Set((object[key] as unknown[]).map((x: unknown) => typeof x)),
	];
	if (
		arrayItemTypes.length > 0 &&
		(arrayItemTypes.length !== 1 || arrayItemTypes[0] !== "function")
	) {
		throw new Error(`The array for key ${key} can only contain functions`);
	}
};

const checkKeyIsAnArrayOfFunctions = ({
	object,
	key,
}: { object: { [key: string]: unknown }; key: string }) => {
	if (Array.isArray(object[key])) {
		if ((object[key] as unknown[]).length > 0) {
			checkAreFunctions({ object, key });
		}
	} else {
		throw new Error(`The ${key} key needs to be an array of functions`);
	}
};

const auditObject = <T extends Record<string, unknown>>(
	object: T,
	keys: string[],
): T => {
	for (const key of keys) {
		if (!object[key]) {
			(object as Record<string, unknown[]>)[key] = [];
		} else {
			checkKeyIsAnArrayOfFunctions({ object, key });
		}
	}
	return object;
};

// Ensures that the server event listeners passed are properly filled in with functions
const auditServerEventListeners = (
	serverEventListeners?: ServerEventListeners | null,
): ServerEventListeners | null => {
	if (!serverEventListeners) return null;
	if (isNotAnObject(serverEventListeners)) {
		throw new Error("serverEventListeners is not an object");
	}

	const keys = ["connection", "listening", "headers", "close", "error"];
	return auditObject(serverEventListeners, keys);
};

// Ensures that the connection event listeners passed are properly filled in with functions
/*
	NOTE - I remember Sarus had something similar to this, but then the 
	conversion to TypeScript removed the need for it as the type helped to 
	raise errors if the wrong parameter was passed.
*/
const auditConnectionEventListeners = (
	connectionEventListeners?: ConnectionEventListeners,
): ConnectionEventListeners | null => {
	if (!connectionEventListeners) return null;
	if (isNotAnObject(connectionEventListeners)) {
		throw new Error("connectionEventListeners is not an object");
	}

	const keys = ["message", "error", "close"];
	return auditObject(connectionEventListeners, keys);
};

export { auditServerEventListeners, auditConnectionEventListeners };
