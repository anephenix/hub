/*
	This is the in-memory data store for Hub.

	It is used for testing purposes and is not suitable for production use, as
	it does not persist data across restarts or support clustering.
*/
import type { DataType, OnMessageFunc, PublishMessageReceivedParams } from "../types";

// Types and Interfaces

type CollectionHash = { [key: string]: unknown[] };
type BanRule = { clientId?: string; host?: string; ipAddress?: string };

type AddRemoveCollectionParams = {
	value: unknown;
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

class MemoryDataStore {
	clients: CollectionHash;
	channels: CollectionHash;
	banRules: BanRule[];
	messageQueue: unknown[] & { onPush?: OnMessageFunc };

	constructor() {
		this.clients = {};
		this.channels = {};
		this.banRules = [];
		this.messageQueue = [] as unknown[];
		/*
			We monkey-patch the push function on the messageQueue array 
			so that it will call the onPush function on the class, 
			to act as a hook or event emitter for when a message is 
			added to the queue.

			In my opinion, we probably want to use an event emitter 
			in the future to replace the monkey-patching of the
			push function.
		*/
		this.messageQueue.push = function (item: PublishMessageReceivedParams) {
			Array.prototype.push.call(this, item);
			// If onPush is defined, we call it with the item
			if (typeof this.onPush === "function") {
				this.onPush(item);
			}
			return this.length;
		};
	}

	bindOnPublish(func: OnMessageFunc) {
		this.messageQueue.onPush = func;
	}

	async putMessageOnQueue(message: PublishMessageReceivedParams) {
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

	async getClientIdsForChannel(channel: string): Promise<unknown[] | undefined> {
		const { channels } = this;
		return channels[channel];
	}

	async getChannelsForClientId(clientId: string): Promise<unknown[] | undefined> {
		const { clients } = this;
		return clients[clientId];
	}

	async getBanRules(): Promise<BanRule[]> {
		return this.banRules;
	}

	async clearBanRules(): Promise<BanRule[]> {
		this.banRules = [];
		return [];
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
