// import { setupNodeGlobals } from './loadNodejsPolyfills';
// await setupNodeGlobals();

import { LocalStorage } from "node-localstorage";
import { WebSocket } from "ws";
// @ts-ignore
global.WebSocket = WebSocket;
global.localStorage = new LocalStorage("./localStorage");
global.sessionStorage = new LocalStorage("./sessionStorage");

import HubClient from "./index.js";

export default HubClient;
