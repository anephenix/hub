import type Sarus from "@anephenix/sarus";
import type { WebSocketServer } from "ws";
// Dependencies
import { encode } from "./dataTransformer.js";
import type RPC from "./rpc.js";
import type {
	DataStoreInstance,
	DataType,
	PublishMessageReceivedParams,
	RPCFunction,
	RPCFunctionArgs,
	WebSocketWithClientId,
} from "./types.js";

const noClientIdError = "No client id was found on the WebSocket";
const noChannelError = "No channel was passed in the data";
const noMessageError = "No message was passed in the data";
const clientMustBeSubscriberError =
	"You must subscribe to the channel to publish messages to it";
const tooManyWildcardChannelConfigurationsMatchedError =
	"Internal error - too many wildcard channel configurations matched the channel";
const wildcardTooAmbiguousError = (channel: string) =>
	`Wildcard channel name too ambiguous - will collide with "${channel}"`;
const clientsCannotPublishToChannelError =
	"Clients cannot publish to the channel";

// Used to implement the subscribersOnly filter function
// @ts-ignore
Set.prototype.filter = function filter<T>(f: (v: T) => boolean): Set<T> {
	const newSet = new Set<T>();
	for (const v of this) if (f(v)) newSet.add(v);
	return newSet;
};

type ChannelConfiguration = {
	authenticate?: (params: { socket: WebSocketWithClientId; data: unknown }) =>
		| Promise<boolean>
		| boolean;
	clientCanPublish?:
		| boolean
		| ((params: { data: unknown; socket: WebSocketWithClientId }) => boolean);
};

interface PubSubConstructorParams {
	wss: WebSocketServer;
	rpc: RPC;
	dataStore: DataStoreInstance;
}

class PubSub {
	wss: WebSocketServer;
	rpc: RPC;
	channelConfigurations: Record<string, ChannelConfiguration>;
	dataStore: DataStoreInstance;

	constructor({ wss, rpc, dataStore }: PubSubConstructorParams) {
		this.wss = wss;
		this.rpc = rpc;
		this.channelConfigurations = {};
		this.dataStore = dataStore;
		this.publish = this.publish.bind(this);
		this.subscribe = this.subscribe.bind(this);
		this.unsubscribe = this.unsubscribe.bind(this);
		this.publishMessageReceived = this.publishMessageReceived.bind(this);
		this.dataStore.bindOnPublish(this.publishMessageReceived);
		this.attachPubSubFunction = this.attachPubSubFunction.bind(this);
		this.unsubscribeClientFromAllChannels =
			this.unsubscribeClientFromAllChannels.bind(this);
		this.attachRPCFunctions();
	}

	attachPubSubFunction(pubSubName: "subscribe" | "publish" | "unsubscribe") {
		const pubSubFunction: RPCFunction = async ({
			data,
			socket,
			reply,
		}: RPCFunctionArgs) => {
			try {
				const pubSubMethod = this[pubSubName] as (params: {
					data: unknown;
					socket: WebSocketWithClientId | Sarus | undefined;
				}) => Promise<unknown>;
				const response = await pubSubMethod({ data, socket });
				reply?.({
					type: "response",
					data: response,
				});
			} catch (error: unknown) {
				if (error instanceof Error) {
					reply?.({
						type: "error",
						error: error.message,
					});
				} else {
					reply?.({
						type: "error",
						error: String(error),
					});
				}
			}
		};
		this.rpc.add(pubSubName, pubSubFunction);
	}

	attachRPCFunctions() {
		const { attachPubSubFunction } = this;
		(["subscribe", "publish", "unsubscribe"] as const).forEach(
			attachPubSubFunction,
		);
	}

	async clientChannelAction({
		clientId,
		channel,
		method,
		message,
	}: {
		clientId: string;
		channel: string;
		method: "addClientToChannel" | "removeClientFromChannel";
		message: string;
	}) {
		await (this.dataStore as DataStoreInstance)[method]({ clientId, channel });
		return {
			success: true,
			message: `Client "${clientId}" ${message} channel "${channel}"`,
		};
	}

	async addClientToChannel({
		clientId,
		channel,
	}: { clientId: string; channel: string }) {
		return await this.clientChannelAction({
			clientId,
			channel,
			method: "addClientToChannel",
			message: "subscribed to",
		});
	}

	async removeClientFromChannel({
		clientId,
		channel,
	}: { clientId: string; channel: string }) {
		return await this.clientChannelAction({
			clientId,
			channel,
			method: "removeClientFromChannel",
			message: "unsubscribed from",
		});
	}

	async unsubscribeClientFromAllChannels({
		ws,
	}: { ws: WebSocketWithClientId }) {
		const { clientId } = ws;
		if (!clientId) return;
		const channels = await this.dataStore.getChannelsForClientId(clientId);
		if (!channels) return;
		for await (const channel of channels) {
			await this.unsubscribe({ socket: ws, data: { channel } });
		}
	}

	getWildcardChannelConfiguration(
		channel: string,
	): ChannelConfiguration | undefined {
		let channelConfiguration: ChannelConfiguration | undefined;
		const wildCardChannelConfigurations = Object.keys(
			this.channelConfigurations,
		).filter((s) => s.match(/\*/) && channel.includes(s.replace(/\*/g, "")));
		if (wildCardChannelConfigurations?.length !== 0) {
			if (wildCardChannelConfigurations.length > 1) {
				throw new Error(tooManyWildcardChannelConfigurationsMatchedError);
			}
			channelConfiguration =
				this.channelConfigurations[wildCardChannelConfigurations[0]];
		}
		return channelConfiguration;
	}

	getChannelConfiguration(channel: string): ChannelConfiguration {
		let channelConfiguration = this.channelConfigurations[channel];
		if (!channelConfiguration) {
			channelConfiguration =
				this.getWildcardChannelConfiguration(channel) || {};
		}
		return channelConfiguration;
	}

	async handleChannelConfiguration({
		channel,
		socket,
		data,
	}: { channel: string; socket: WebSocketWithClientId; data: unknown }) {
		const channelConfiguration = this.getChannelConfiguration(channel);
		if (channelConfiguration?.authenticate) {
			const authenticated = await channelConfiguration.authenticate({
				socket,
				data,
			});
			if (!authenticated) throw new Error("Not authenticated");
		}
	}

	async subscribe({
		data,
		socket,
	}: { data: unknown; socket: WebSocketWithClientId }) {
		const { clientId } = socket;
		const { channel } = data as { channel: string };
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		await this.handleChannelConfiguration({ channel, socket, data });
		return await this.addClientToChannel({ clientId, channel });
	}

	async checkClientCanPublish({
		channelConfiguration,
		data,
		socket,
	}: {
		channelConfiguration?: ChannelConfiguration;
		data: unknown;
		socket: WebSocketWithClientId;
	}) {
		if (channelConfiguration?.clientCanPublish === false) {
			throw new Error(clientsCannotPublishToChannelError);
		}
		if (typeof channelConfiguration?.clientCanPublish === "function") {
			const allowed = channelConfiguration.clientCanPublish({ data, socket });
			if (!allowed) throw new Error(clientsCannotPublishToChannelError);
		}
	}

	async checkClientIsASubscriberToChannel({
		clientId,
		channel,
	}: { clientId: string; channel: string }) {
		const subscribers = await this.dataStore.getClientIdsForChannel(channel);
		if (!subscribers || subscribers.length === 0) {
			throw new Error(clientMustBeSubscriberError);
		}
		if (subscribers.indexOf(clientId) === -1) {
			throw new Error(clientMustBeSubscriberError);
		}
	}

	async publish({
		data,
		socket,
	}: {
		data: { channel: string; message: DataType; excludeSender?: boolean };
		socket?: WebSocketWithClientId;
	}) {
		const clientId = socket?.clientId;
		const { channel, message, excludeSender } = data;
		const channelConfiguration = this.getChannelConfiguration(channel);
		if (socket && !clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		if (!message) throw new Error(noMessageError);

		if (clientId) {
			await this.checkClientCanPublish({ channelConfiguration, data, socket });
			await this.checkClientIsASubscriberToChannel({ clientId, channel });
		}

		await this.dataStore.putMessageOnQueue({
			channel,
			message,
			clientId,
			excludeSender,
		});

		return {
			success: true,
			message: "Published message",
		};
	}

	async publishMessageReceived({
		channel,
		message,
		clientId,
		excludeSender,
	}: PublishMessageReceivedParams) {
		const subscribers = await this.dataStore.getClientIdsForChannel(channel);
		const payload = encode({
			action: "message",
			type: "event",
			data: { channel, message },
		});

		if (subscribers && subscribers.length > 0) {
			const subscribersOnly = (client: WebSocketWithClientId) => {
				return subscribers.indexOf(client.clientId) !== -1;
			};

			for (const client of this.wss.clients) {
				if (!subscribersOnly(client)) continue;
				if (!clientId) {
					client.send(payload);
					continue;
				}
				if (!excludeSender) {
					client.send(payload);
					continue;
				}
				if ((client as WebSocketWithClientId).clientId !== clientId) {
					client.send(payload);
				}
			}
		}
	}

	async unsubscribe({
		data,
		socket,
	}: { data: unknown; socket: WebSocketWithClientId }) {
		const { clientId } = socket;
		const { channel } = data as { channel: string };
		if (!clientId) throw new Error(noClientIdError);
		if (!channel) throw new Error(noChannelError);
		return await this.removeClientFromChannel({
			clientId,
			channel,
		});
	}

	compareWildcardChannelNames({
		channel,
		wildcardChannel,
	}: { channel: string; wildcardChannel: string }) {
		const formattedChannel = channel.replace(/\*/g, "");
		const formattedWildcardChannel = wildcardChannel.replace(/\*/g, "");
		const compare = formattedChannel.includes(formattedWildcardChannel);
		const reverseCompare = formattedWildcardChannel.includes(formattedChannel);
		if (compare || reverseCompare) {
			throw new Error(wildcardTooAmbiguousError(wildcardChannel));
		}
	}

	addChannelConfiguration({
		channel,
		authenticate,
		clientCanPublish,
	}: {
		channel: string;
		authenticate?: ChannelConfiguration["authenticate"];
		clientCanPublish?: ChannelConfiguration["clientCanPublish"];
	}) {
		const wildCardChannelConfigurations = Object.keys(
			this.channelConfigurations,
		).filter((s) => s.match(/\*/));

		for (const wildcardChannel of wildCardChannelConfigurations) {
			this.compareWildcardChannelNames({ channel, wildcardChannel });
		}
		this.channelConfigurations[channel] = {
			authenticate,
			clientCanPublish,
		};
	}

	removeChannelConfiguration(channel: string) {
		delete this.channelConfigurations[channel];
	}
}

export default PubSub;
