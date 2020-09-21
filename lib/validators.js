const isNotAnObject = (parameter) => {
	if (Array.isArray(parameter)) return true;
	return !(parameter instanceof Object);
};

const auditObject = (object, keys) => {
	for (const key of keys) {
		if (!object[key]) {
			object[key] = [];
		} else {
			if (Array.isArray(object[key])) {
				if (object[key].length > 0) {
					const arrayItemTypes = [
						...new Set(object[key].map((x) => typeof x)),
					];
					if (
						arrayItemTypes.length > 0 &&
						arrayItemTypes !== ['function']
					) {
						throw new Error(
							`The array for key ${key} can only contain functions`
						);
					}
				}
			} else {
				throw new Error(
					`The ${key} key needs to be an array of functions`
				);
			}
		}
	}
	return object;
};

// Ensures that the server event listeners passed are properly filled in with functions
const auditServerEventListeners = (serverEventListeners) => {
	if (!serverEventListeners) return null;
	if (isNotAnObject(serverEventListeners)) {
		throw new Error('serverEventListeners is not an object');
	}

	const keys = ['connection', 'listening', 'headers', 'close', 'error'];
	serverEventListeners = auditObject(serverEventListeners, keys);
	return serverEventListeners;
};

// Ensures that the connection event listeners passed are properly filled in with functions
const auditConnectionEventListeners = (connectionEventListeners) => {
	if (!connectionEventListeners) return null;
	if (isNotAnObject(connectionEventListeners)) {
		throw new Error('connectionEventListeners is not an object');
	}

	const keys = ['message', 'error', 'close'];
	connectionEventListeners = auditObject(connectionEventListeners, keys);
	return connectionEventListeners;
};

module.exports = { auditServerEventListeners, auditConnectionEventListeners };
