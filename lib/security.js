class Security {
	constructor({ dataStore }) {
		this.dataStore = dataStore;
	}

	async ban({ clientId, host, ipAddress }) {
		await this.dataStore.addBanRule({ clientId, host, ipAddress });
	}
}

module.exports = Security;
