// Types and Interfaces

interface DataStore {
	addBanRule(params: {
		clientId: string;
		host: string;
		ipAddress: string;
	}): Promise<void>;
}

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
	dataStore: DataStore;

	constructor({ dataStore }: { dataStore: DataStore }) {
		this.dataStore = dataStore;
	}

	async ban({ clientId, host, ipAddress }: BanParams): Promise<void> {
		await this.dataStore.addBanRule({ clientId, host, ipAddress });
	}
}
