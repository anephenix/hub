/*
	This is the client for Hub. It can run in both the
	web browser and in Node.js.

	It can be used to do the following:

	- Connect to a Hub server
	- Setup RPC function calls
	- Subscribe to channels
	- Unsubscribe from channels
	- Publish messages to channels,
*/

import Sarus from "@anephenix/sarus";
import { delay, delayUntil } from "../../helpers/delay.js";
// Dependencies
import RPC from "../rpc.js";
import type {
	ChannelHandler,
	ChannelOptions,
	DataType,
	HubClientOptions,
	MessageData,
	RPCFunctionArgs,
	SetClientIdData,
	StorageType,
} from "../types.js";
import { isNode } from "../utils.js";

class HubClient {
	context: (Window & typeof globalThis) | typeof global;
	sarus: Sarus;
	rpc: RPC;
	clientIdKey: string;
	storageType: StorageType;
	channelMessageHandlers: Record<string, ChannelHandler[]>;
	channels: string[];
	channelOptions: Record<string, ChannelOptions | null>;

	constructor({
		url,
		sarusConfig,
		clientIdKey,
		storageType,
	}: HubClientOptions) {
		if (!sarusConfig) sarusConfig = { url };
		if (!sarusConfig.url) sarusConfig.url = url;

		this.context = isNode() === true ? global : window;
		this.sarus = new Sarus(sarusConfig);
		this.rpc = new RPC({ sarus: this.sarus });
		this.clientIdKey = clientIdKey || "sarus-client-id";
		this.storageType = storageType || "localStorage";
		this.enableClientIdentifcation();
		this.subscribe = this.subscribe.bind(this);
		this.unsubscribe = this.unsubscribe.bind(this);
		this.publish = this.publish.bind(this);
		this.resubscribeOnReconnect = this.resubscribeOnReconnect.bind(this);
		this.isConnected = this.isConnected.bind(this);
		this.channelMessageHandlers = {};
		this.channels = [];
		this.channelOptions = {};
		this.sarus.on("open", this.resubscribeOnReconnect);
	}

	/*
		This function checks if the Sarus instance is connected.
		It returns true if the WebSocket is open, otherwise false.
	*/
	isConnected() {
		return this.sarus.ws?.readyState === 1;
	}

	/*
		This function is called when the Sarus instance reconnects.
		It resubscribes to all channels that the client was subscribed to
		before the disconnection.
	*/
	async resubscribeOnReconnect() {
		if (this.channels.length === 0) return;
		await delayUntil(this.isConnected);
		await delayUntil(async () => {
			await delay(50);
			const response = await this.rpc.send({
				action: "has-client-id",
			});
			const { hasClientId } = response as { hasClientId: boolean };
			return hasClientId;
		});
		for await (const channel of this.channels) {
			const opts = this.channelOptions[channel];
			await this.subscribe(channel, opts || {});
		}
	}

	/*
		This function lists all channel message handlers for the client.
		If a specific channel is provided, it returns the handlers for that channel,
		otherwise it returns all handlers.
	*/
	listChannelMessageHandlers(channel?: string) {
		if (!channel) return this.channelMessageHandlers;
		return this.channelMessageHandlers[channel] || null;
	}

	/*
		This function adds a channel message handler to the client's
		list of handlers for a specific channel. If the channel does not
		have any handlers yet, it initializes an array for that channel.
	*/
	addChannelMessageHandler(channel: string, handlerFunc: ChannelHandler) {
		if (!this.channelMessageHandlers[channel]) {
			this.channelMessageHandlers[channel] = [handlerFunc];
		} else {
			this.channelMessageHandlers[channel].push(handlerFunc);
		}
	}

	/*
		This function removes a channel message handler by either its function reference
		or its name. If the handler is not found, it throws an error.
	*/
	removeChannelMessageHandler(
		channel: string,
		handlerFuncOrName: ChannelHandler | string,
	) {
		const existingFunc = this.findFunction(channel, handlerFuncOrName);
		if (existingFunc) {
			const index = this.channelMessageHandlers[channel].indexOf(existingFunc);
			this.channelMessageHandlers[channel].splice(index, 1);
		} else {
			throw new Error(`Function not found for channel "${channel}"`);
		}
	}

	/*
		This function finds a channel message handler by either its function reference
		or its name. It returns the handler if found, otherwise returns undefined.
	*/
	findFunction(
		channel: string,
		handlerFuncOrName: ChannelHandler | string,
	): ChannelHandler | undefined {
		if (typeof handlerFuncOrName === "string") {
			const byName = (f: ChannelHandler) => f.name === handlerFuncOrName;
			return this.channelMessageHandlers[channel]?.find(byName);
		}
		if (
			this.channelMessageHandlers[channel] &&
			this.channelMessageHandlers[channel].indexOf(handlerFuncOrName) !== -1
		) {
			return handlerFuncOrName;
		}
	}

	/*
		This function enables the client to identify itself by setting up
		RPC methods for getting and setting the client ID. It also listens
		for messages on the 'message' action and calls the appropriate handlers
		for the channel.

		It also sets up a 'kick' action that disables automatic reconnection
		for the Sarus instance.
	*/
	enableClientIdentifcation() {
		const { storageType, clientIdKey, rpc, sarus } = this;
		rpc.add("get-client-id", ({ reply }: RPCFunctionArgs) => {
			try {
				const clientId = this.context[storageType].getItem(clientIdKey);
				reply?.({ data: { clientId } });
			} catch (err) {
				reply?.({
					type: "error",
					error: "Failed to retrieve client ID",
				});
				throw err;
			}
		});

		rpc.add("set-client-id", ({ data, reply }: RPCFunctionArgs) => {
			const { clientId } = data as SetClientIdData;
			this.context[storageType].setItem(clientIdKey, clientId);
			reply?.({ data: { success: true } });
		});

		rpc.add("message", ({ type, action, data }: RPCFunctionArgs) => {
			if (type === "event" && action === "message") {
				const { channel, message } = data as MessageData;

				const handlers = this.channelMessageHandlers[channel];
				if (handlers) {
					for (const func of handlers as ChannelHandler[]) {
						func(message);
					}
				}
			}
		});

		rpc.add("kick", () => {
			sarus.reconnectAutomatically = false;
		});
	}

	/*
		This function adds a channel to the client's list of channels
		that it keeps a record of in memory. It also allows for options
		to be passed for that channel.
	*/
	addChannel(channel: string, opts?: ChannelOptions) {
		if (this.channels.indexOf(channel) === -1) {
			this.channels.push(channel);
			this.channelOptions[channel] = opts || {};
		}
	}

	/*
		This function removes a channel from the client's list of channels
		that it keeps a record of in memory.
	*/
	removeChannel(channel: string) {
		const channelIndex = this.channels.indexOf(channel);
		if (channelIndex !== -1) {
			this.channels.splice(channelIndex, 1);
			this.channelOptions[channel] = null;
		}
	}

	/*
		This function subscribes the client to a channel.
	*/
	async subscribe(channel: string, opts?: ChannelOptions) {
		const request = {
			action: "subscribe",
			data: { channel, ...(opts || {}) },
		};
		const response = await this.rpc.send(request);
		this.addChannel(channel, opts);
		return response;
	}

	/*
		This function unsubscribes the client from a channel.
	*/
	async unsubscribe(channel: string) {
		const request = {
			action: "unsubscribe",
			data: { channel },
		};
		const response = await this.rpc.send(request);
		this.removeChannel(channel);
		return response;
	}

	/*
		This function publishes a message to a specific channel.
	*/
	async publish(channel: string, message: DataType, excludeSender = false) {
		const request = {
			action: "publish",
			data: { channel, message, excludeSender },
		};
		return await this.rpc.send(request);
	}

	/*
		This function retrieves the client ID from the storage.
		If the client ID is not set, it returns null.
	*/
	getClientId(): string | null {
		const { storageType, clientIdKey } = this;
		const clientId = this.context[storageType].getItem(clientIdKey);
		return clientId || null;
	}

	/*
		A function to ensure that the client is ready to use once:

		- The WebSocket connection is open
		- The client ID is set
	*/
	async isReady() {
		await delayUntil(() => this.isConnected() && this.getClientId() !== null);
		return;
	}
}

export default HubClient;
