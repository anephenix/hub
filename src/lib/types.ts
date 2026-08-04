// Types and Interfaces

import type { IncomingMessage } from "node:http";
import type Sarus from "@anephenix/sarus";
// Dependencies
import type { SarusClassParams } from "@anephenix/sarus";
import type { CloseEvent, WebSocket } from "ws";
import type dataStores from "./dataStores/index.js";

/* DataTransformer */

/* The type of data that is sent as a JSON string over WebSocket. Used in dataTransformer.ts */
type DataType = object | string | number | boolean | null;

/* HubClient */

type StorageType = "localStorage" | "sessionStorage";
type ChannelHandler = (message: unknown) => void;
type MessageIdExtractor = (message: DataType) => string | number;
type ChannelOptions = Record<string, unknown> & {
	getMessageId?: MessageIdExtractor;
};
type MissedMessagesDelivery = "individual" | "bulk";

interface HubClientOptions {
	url: string;
	sarusConfig?: SarusClassParams;
	clientIdKey?: string;
	storageType?: StorageType;
	autoFetchMissedMessages?: boolean;
	missedMessagesDelivery?: MissedMessagesDelivery;
}

// RPC

type RPCPayload = {
	id: string;
	action: string;
	type: "request" | "response" | "error";
	data?: unknown;
	error?: unknown;
	noReply?: boolean;
};

type RPCFunctionArgs = {
	id: string;
	action: string;
	type: string;
	data?: unknown;
	socket?: Sarus | WebSocketWithClientId | undefined;
	reply?: (response: Partial<RPCPayload>) => unknown;
};

type RPCFunction = (args: RPCFunctionArgs) => void;

type RPCArgs = {
	sarus?: Sarus;
};

type SendArgs = {
	ws?: WebSocket;
	action: string;
	data?: unknown;
	noReply?: boolean;
};

// Validators

// Types and interfaces

type ServerEventListeners = {
	connection: Array<(ws: WebSocketWithClientId, req: IncomingMessage) => void>;
	error: Array<(event: Error) => void>;
	listening: Array<(event: unknown) => void>;
	headers: Array<(event: unknown) => void>;
	close: Array<(event: unknown) => void>;
};

type ConnectionEventListeners = {
	message: Array<
		(args: { data?: unknown; message: string; ws: WebSocket }) => void
	>;
	close: Array<(args: { event: CloseEvent; ws: WebSocket }) => void>;
	error: Array<(args: { error: Error; ws: WebSocket }) => void>;
};

// DataStore types
type DataStoreType = keyof typeof dataStores;
type DataStoreInstance = InstanceType<
	(typeof dataStores)[keyof typeof dataStores]
>;
type OnMessageFunc = (message: PublishMessageReceivedParams) => Promise<void>;

interface RedisDataStoreConfig {
	channelsKey?: string;
	clientsKey?: string;
	banRulesKey?: string;
	redisConfig?: object;
}

// ClientId

interface WebSocketWithClientId extends WebSocket {
	clientId?: string;
	host?: string;
	ipAddress?: string;
}

// Client

type SetClientIdData = { clientId: string };

type MessageData = {
	channel: string;
	message: DataType;
	catchup?: boolean;
};

// PubSub

type PublishMessageReceivedParams = {
	channel: string;
	message: DataType;
	clientId?: string;
	excludeSender?: boolean;
};

type MissedMessage = {
	id: string | number;
	message: DataType;
};

type FetchMissedMessagesHandler = (params: {
	clientId: string;
	channel: string;
	lastMessageId?: string | number;
}) => Promise<MissedMessage[]> | MissedMessage[];

type FetchMissedMessagesChannelRequest = {
	channel: string;
	lastMessageId?: string | number;
};

type FetchMissedMessagesData = {
	channels: FetchMissedMessagesChannelRequest[];
	delivery?: MissedMessagesDelivery;
};

// OriginCheck and IPCheck
type NextFunction = (
	socket: WebSocketWithClientId,
	req: IncomingMessage,
) => void;

export type {
	ChannelHandler,
	ChannelOptions,
	ConnectionEventListeners,
	DataStoreInstance,
	DataStoreType,
	DataType,
	FetchMissedMessagesChannelRequest,
	FetchMissedMessagesData,
	FetchMissedMessagesHandler,
	HubClientOptions,
	MessageData,
	MessageIdExtractor,
	MissedMessage,
	MissedMessagesDelivery,
	NextFunction,
	OnMessageFunc,
	PublishMessageReceivedParams,
	RedisDataStoreConfig,
	RPCArgs,
	RPCFunction,
	RPCFunctionArgs,
	RPCPayload,
	SendArgs,
	ServerEventListeners,
	SetClientIdData,
	StorageType,
	WebSocketWithClientId,
};
