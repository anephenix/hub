// Types and Interfaces

// Dependencies
import type { SarusClassParams } from "@anephenix/sarus";
import type Sarus from "@anephenix/sarus";

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
	socket?: WebSocket;
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
};
