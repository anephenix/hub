// Types and Interfaces

import type { DataStoreInstance } from "./types";

interface BanParams {
	clientId: string;
	host: string;
	ipAddress: string;
}

/*
	This is used to manage security-related actions, such as banning clients
	from connecting to the WebSocket server.
*/
export class Security {
	dataStore: DataStoreInstance;

	constructor({ dataStore }: { dataStore: DataStoreInstance }) {
		this.dataStore = dataStore;
	}

	async ban({ clientId, host, ipAddress }: BanParams): Promise<void> {
		await this.dataStore.addBanRule({ clientId, host, ipAddress });
	}
}
