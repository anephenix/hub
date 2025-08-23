// import { setupNodeGlobals } from './loadNodejsPolyfills';
// await setupNodeGlobals();

import { LocalStorage } from "node-localstorage";
import { WebSocket } from "ws";

// @ts-ignore
global.WebSocket = WebSocket;
global.localStorage = new LocalStorage("./localStorage");
global.sessionStorage = new LocalStorage("./sessionStorage");

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
import HubClient from "./index.js";
export type {
	ChannelHandler,
	ChannelOptions,
	DataType,
	HubClientOptions,
	MessageData,
	RPCFunctionArgs,
	SetClientIdData,
	StorageType,
};
export default HubClient;
