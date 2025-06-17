// Types and Interfaces

// Dependencies
import type { SarusClassParams } from "@anephenix/sarus";
import type Sarus from "@anephenix/sarus";
import type dataStores from "./dataStores";

/* DataTransformer */

/* The type of data that is sent as a JSON string over WebSocket. Used in dataTransformer.ts */
type DataType = object | string | number | boolean | null;

/* HubClient */

type StorageType = "localStorage" | "sessionStorage";
type ChannelHandler = (message: unknown) => void;
type ChannelOptions = Record<string, unknown>;

interface HubClientOptions {
	url: string;
	sarusConfig?: SarusClassParams;
	clientIdKey?: string;
	storageType?: StorageType;
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

type ListenerFunction = (...args: unknown[]) => void;

type ServerEventListeners = {
	connection?: ListenerFunction[];
	listening?: ListenerFunction[];
	headers?: ListenerFunction[];
	close?: ListenerFunction[];
	error?: ListenerFunction[];
	[key: string]: ListenerFunction[] | undefined;
};

type ConnectionEventListeners = {
	message?: ListenerFunction[];
	error?: ListenerFunction[];
	close?: ListenerFunction[];
	[key: string]: ListenerFunction[] | undefined;
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
};

// PubSub

type PublishMessageReceivedParams = {
	channel: string;
	message: DataType;
	clientId?: string;
	excludeSender?: boolean;
};

export type {
	DataType,
	StorageType,
	ChannelHandler,
	ChannelOptions,
	HubClientOptions,
	SendArgs,
	RPCPayload,
	RPCFunction,
	RPCArgs,
	RPCFunctionArgs,
	ServerEventListeners,
	ConnectionEventListeners,
	ListenerFunction,
	DataStoreType,
	DataStoreInstance,
	OnMessageFunc,
	RedisDataStoreConfig,
	WebSocketWithClientId,
	SetClientIdData,
	MessageData,
	PublishMessageReceivedParams
};
