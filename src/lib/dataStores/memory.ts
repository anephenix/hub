type CollectionHash = { [key: string]: any[] };
type BanRule = { clientId?: string; host?: string; ipAddress?: string };

type AddRemoveCollectionParams = {
	value: any;
	hash: CollectionHash;
	key: string;
};

type PerformActionParams = {
	action: "addItemToCollection" | "removeItemFromCollection";
	clientId: string;
	channel: string;
};

type AddRemoveClientChannelParams = {
	clientId: string;
	channel: string;
};

type BanRuleParams = {
	clientId?: string;
	host?: string;
	ipAddress?: string;
};

type OnPushFunc = (item: any) => void;

class MemoryDataStore {
	clients: CollectionHash;
	channels: CollectionHash;
	banRules: BanRule[];
	messageQueue: any[] & { onPush?: OnPushFunc };

	constructor() {
		this.clients = {};
		this.channels = {};
		this.banRules = [];
		this.messageQueue = [] as any[];
		// Monkey-patch push to call onPush
		this.messageQueue.push = function (item: any) {
			Array.prototype.push.call(this, item);
			if (typeof this.onPush === "function") {
				this.onPush(item);
			}
		};
	}

	bindOnPublish(func: OnPushFunc) {
		this.messageQueue.onPush = func;
	}

	async putMessageOnQueue(message: any) {
		this.messageQueue.push(message);
	}

	async addItemToCollection({ value, hash, key }: AddRemoveCollectionParams) {
		if (!hash[key]) {
			hash[key] = [value];
		} else {
			if (hash[key].indexOf(value) === -1) {
				hash[key].push(value);
			}
		}
	}

	async removeItemFromCollection({
		value,
		hash,
		key,
	}: AddRemoveCollectionParams) {
		if (!hash[key]) return;
		const valueIndex = hash[key].indexOf(value);
		if (valueIndex === -1) return;
		hash[key].splice(valueIndex, 1);
	}

	async performActionForClientAndChannel({
		action,
		clientId,
		channel,
	}: PerformActionParams) {
		const { channels, clients } = this;
		await Promise.all([
			this[action]({
				hash: channels,
				key: channel,
				value: clientId,
			}),
			this[action]({
				hash: clients,
				key: clientId,
				value: channel,
			}),
		]);
	}

	async addClientToChannel({
		clientId,
		channel,
	}: AddRemoveClientChannelParams) {
		await this.performActionForClientAndChannel({
			action: "addItemToCollection",
			clientId,
			channel,
		});
	}

	async removeClientFromChannel({
		clientId,
		channel,
	}: AddRemoveClientChannelParams) {
		await this.performActionForClientAndChannel({
			action: "removeItemFromCollection",
			clientId,
			channel,
		});
	}

	async getClientIdsForChannel(channel: string): Promise<any[] | undefined> {
		const { channels } = this;
		return channels[channel];
	}

	async getChannelsForClientId(clientId: string): Promise<any[] | undefined> {
		const { clients } = this;
		return clients[clientId];
	}

	async getBanRules(): Promise<BanRule[]> {
		return this.banRules;
	}

	async clearBanRules(): Promise<BanRule[]> {
		return (this.banRules = []);
	}

	async hasBanRule(item: BanRule): Promise<boolean> {
		const banRules = await this.getBanRules();
		const matchFilter = (b: BanRule) => {
			const keys = Object.keys(b).filter((x) => b[x as keyof BanRule]);
			const matches = keys.map(
				(k) => b[k as keyof BanRule] === item[k as keyof BanRule],
			);
			return matches.every((x) => x === true);
		};
		return banRules.filter(matchFilter).length > 0;
	}

	async addBanRule({ clientId, host, ipAddress }: BanRuleParams) {
		const existsAlready = await this.hasBanRule({
			clientId,
			host,
			ipAddress,
		});
		if (existsAlready) return;
		this.banRules.push({ clientId, host, ipAddress });
	}

	async removeBanRule({
		clientId,
		host,
		ipAddress,
	}: BanRuleParams): Promise<BanRule | null> {
		const matchFilter = (b: BanRule) => {
			return (
				b.clientId === clientId && b.host === host && b.ipAddress === ipAddress
			);
		};
		const banRule = this.banRules.find(matchFilter);

		if (!banRule) return null;
		const index = this.banRules.indexOf(banRule);
		this.banRules.splice(index, 1);
		return banRule;
	}
}

export default MemoryDataStore;
