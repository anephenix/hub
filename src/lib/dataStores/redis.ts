/*
	This is the Redis data store for Hub, which uses Redis to store the data.

	We recommend using this data store in production environments, as it 
	supports persistence across restarts and can be clustered for scaling.
*/

import { type RedisClientType, createClient } from "redis";
import { decode, encode } from "../dataTransformer.js";
// Dependencies
import type {
	DataType,
	OnMessageFunc,
	PublishMessageReceivedParams,
	RedisDataStoreConfig,
} from "../types.js";

// Types and Interfaces

interface CollectionActionParams {
	value: string;
	hash: string;
	key: string;
}

// NOTE - some of these types might also be used in the memory data store,
// so we can consider moving them to a shared file in the future if needed.
interface ClientChannelActionParams {
	action: "addItemToCollection" | "removeItemFromCollection";
	clientId: string;
	channel: string;
}

interface BanRule {
	clientId?: string;
	host?: string;
	ipAddress?: string;
	[key: string]: unknown;
}

// The RedisDataStore Class
class RedisDataStore {
	redis: RedisClientType;
	internalRedis: RedisClientType;
	channelsKey: string;
	clientsKey: string;
	banRulesKey: string;
	messageQueueChannel: string;
	onMessage: OnMessageFunc = async () => {};

	constructor({
		channelsKey,
		clientsKey,
		banRulesKey,
		redisConfig,
	}: RedisDataStoreConfig) {
		this.redis = createClient(redisConfig);
		this.internalRedis = createClient(redisConfig);
		this.channelsKey = channelsKey || "hub-channels";
		this.clientsKey = clientsKey || "hub-clients";
		this.banRulesKey = banRulesKey || "hub-ban-rules";
		this.messageQueueChannel = "hub-message-queue";
		this.connectAndSubscribe();
	}

	async connectAndSubscribe() {
		const { messageQueueChannel } = this;
		await this.redis.connect();
		await this.internalRedis.connect();
		// Subscribe to internal channel
		await this.internalRedis.subscribe(
			this.messageQueueChannel,
			async (message: string, channel: string) => {
				if (channel === messageQueueChannel) {
					await this.onMessage(decode(message) as PublishMessageReceivedParams);
				}
			},
		);
	}

	bindOnPublish(func: OnMessageFunc) {
		this.onMessage = func;
	}

	async putMessageOnQueue(message: DataType) {
		await this.redis.publish(this.messageQueueChannel, encode(message));
	}

	async addItemToCollection({ value, hash, key }: CollectionActionParams) {
		const keyExists = await this.redis.hExists(hash, key);
		if (!keyExists) {
			await this.redis.hSet(hash, key, encode([value]));
		} else {
			const encodedValues = await this.redis.hGet(hash, key);
			if (!encodedValues) return;
			const values: string[] = decode(encodedValues) as string[];
			if (values.indexOf(value) === -1) {
				values.push(value);
				await this.redis.hSet(hash, key, encode(values));
			}
		}
	}

	async removeItemFromCollection({ value, hash, key }: CollectionActionParams) {
		const keyExists = await this.redis.hExists(hash, key);
		if (keyExists) {
			const encodedValues = await this.redis.hGet(hash, key);
			if (!encodedValues) return;
			const values: string[] = decode(encodedValues) as string[];
			const valueIndex = values.indexOf(value);
			if (valueIndex > -1) {
				values.splice(valueIndex, 1);
				await this.redis.hSet(hash, key, encode(values));
			}
		}
	}

	async performActionForClientAndChannel({
		action,
		clientId,
		channel,
	}: ClientChannelActionParams) {
		await Promise.all([
			this[action]({
				hash: this.channelsKey,
				key: channel,
				value: clientId,
			}),
			this[action]({
				hash: this.clientsKey,
				key: clientId,
				value: channel,
			}),
		]);
	}

	async addClientToChannel({
		clientId,
		channel,
	}: { clientId: string; channel: string }) {
		await this.performActionForClientAndChannel({
			action: "addItemToCollection",
			clientId,
			channel,
		});
	}

	async removeClientFromChannel({
		clientId,
		channel,
	}: { clientId: string; channel: string }) {
		await this.performActionForClientAndChannel({
			action: "removeItemFromCollection",
			clientId,
			channel,
		});
	}

	async getClientIdsForChannel(channel: string): Promise<string[]> {
		const encodedValues = await this.redis.hGet(this.channelsKey, channel);
		if (!encodedValues) return [];
		return decode(encodedValues) as string[];
	}

	async getChannelsForClientId(clientId: string): Promise<string[]> {
		const encodedValues = await this.redis.hGet(this.clientsKey, clientId);
		if (!encodedValues) return [];
		return decode(encodedValues) as string[];
	}

	async getBanRules(): Promise<BanRule[]> {
		const list = await this.redis.lRange(this.banRulesKey, 0, -1);
		if (!list || list.length === 0) return [] as BanRule[];
		return list.map((l) => decode(l) as BanRule) as BanRule[];
	}

	async clearBanRules() {
		return await this.redis.del(this.banRulesKey);
	}

	async hasBanRule(item: BanRule): Promise<boolean> {
		const banRules = await this.getBanRules();
		const matchFilter = (b: BanRule) => {
			const keys = Object.keys(b).filter((x) => b[x]);
			const matches = keys.map((k) => b[k] === item[k]);
			return matches.every((x) => x === true);
		};
		return banRules.filter(matchFilter).length > 0;
	}

	async addBanRule({ clientId, host, ipAddress }: BanRule) {
		const existsAlready = await this.hasBanRule({
			clientId,
			host,
			ipAddress,
		});
		if (existsAlready) return;
		const encodedRule = encode({ clientId, host, ipAddress });
		return await this.redis.lPush(this.banRulesKey, encodedRule);
	}

	async removeBanRule({ clientId, host, ipAddress }: BanRule) {
		const matchFilter = (b: BanRule) => {
			return (
				b.clientId === clientId && b.host === host && b.ipAddress === ipAddress
			);
		};
		const banRules = await this.getBanRules();
		const banRule = banRules.find(matchFilter);

		if (!banRule) return null;
		await this.redis.lRem(this.banRulesKey, 0, encode(banRule));
		return banRule;
	}
}

export default RedisDataStore;
