// Types and Interfaces

import type { IncomingMessage } from "node:http";
import type Sarus from "@anephenix/sarus";
// Dependencies
import type { SarusClassParams } from "@anephenix/sarus/dist/esm/index.js";
import type { CloseEvent, Data, WebSocket } from "ws";
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
};

// PubSub

type PublishMessageReceivedParams = {
	channel: string;
	message: DataType;
	clientId?: string;
	excludeSender?: boolean;
};

// OriginCheck and IPCheck
type NextFunction = (
	socket: WebSocketWithClientId,
	req: IncomingMessage,
) => void;

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
	DataStoreType,
	DataStoreInstance,
	OnMessageFunc,
	RedisDataStoreConfig,
	WebSocketWithClientId,
	SetClientIdData,
	MessageData,
	PublishMessageReceivedParams,
	NextFunction,
};
