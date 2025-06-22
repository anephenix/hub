/*
	RPC (Remote Procedure Call)
	---------------------------

	This is the Remote Procedure Call JavaScript class. It handles sending
	and receiving messages to/from WebSocket clients, and is used by the 
	clientId and PubSub components to handling message parsing and sending.

	Developers can also add their own custom rpc actions using this library,
	so that they can build APIs for things like fetching commodity prices 
	over WebSockets, or implementing chat functionality in their apps.
*/

import type Sarus from "@anephenix/sarus";
import type { GenericFunction } from "@anephenix/sarus";
// Dependencies
import { v4 as uuidv4 } from "uuid";
import { decode, encode } from "./dataTransformer.js";

import type {
	RPCArgs,
	RPCFunction,
	RPCPayload,
	SendArgs,
	WebSocketWithClientId,
} from "./types.js";

class RPC {
	sarus?: Sarus;
	requests: RPCPayload[];
	responses: RPCPayload[];
	actions: Record<string, RPCFunction[]>;
	type: "client" | "server";

	constructor(args?: RPCArgs) {
		const sarus = args?.sarus;
		this.requests = [];
		this.responses = [];
		this.actions = {};
		this.type = sarus ? "client" : "server";
		if (sarus) this.sarus = sarus;
		this.receive = this.receive.bind(this);
		// Automatically enable RPC message parsing on Sarus
		this.sarus?.on("message", this.receive as GenericFunction);
	}

	add(action: string, func: RPCFunction) {
		const existingFunctions = this.actions[action];
		if (!existingFunctions) {
			this.actions[action] = [func];
		} else {
			this.actions[action].push(func);
		}
	}

	list(action?: string) {
		if (!action) return this.actions;
		return this.actions[action];
	}

	remove(action: string, func: RPCFunction) {
		const index = this.actions[action]?.indexOf(func);
		if (index !== undefined && index !== -1) {
			this.actions[action].splice(index, 1);
		}
	}

	handleError({
		error,
		reply,
	}: { error: unknown; reply: (response: Partial<RPCPayload>) => unknown }) {
		reply({
			type: "error",
			error,
		});
	}

	setMessageAndSocket({
		params,
		sarus,
	}: {
		params: { data?: unknown; message: string; ws: WebSocketWithClientId };
		sarus?: Sarus;
	}) {
		let message: string;
		let ws: WebSocketWithClientId | undefined;
		if (sarus) {
			message = params.data as string;
		} else {
			message = params.message as string;
			ws = params.ws;
		}
		return { message, ws } as {
			message: string;
			ws: WebSocketWithClientId | undefined;
		};
	}

	setupReply({
		id,
		action,
		socket,
		noReply,
	}: {
		id: string;
		action: string;
		socket: Sarus | WebSocketWithClientId | undefined;
		noReply?: boolean;
	}) {
		const reply = (response: Partial<RPCPayload>) => {
			if (noReply) return null;
			const responsePayload: RPCPayload = {
				id,
				action,
				type: response.type || "response",
				data: response.data,
				error: response.error,
			};
			return socket?.send(encode(responsePayload));
		};
		return reply;
	}

	isNotARequest({ requests, id }: { requests: RPCPayload[]; id: string }) {
		return !requests.find((r) => r.id === id);
	}

	callFunctionsOrReturnError({
		action,
		type,
		id,
		reply,
		data,
		socket,
	}: {
		action: string;
		type: string;
		id: string;
		reply: (response: Partial<RPCPayload>) => unknown;
		data: unknown;
		socket?: Sarus | WebSocketWithClientId | undefined;
	}) {
		const existingFunctions = this.actions[action];
		if (action && type) {
			if (!existingFunctions) {
				return this.handleError({
					error: `No ${this.type} action found`,
					reply,
				});
			}
			for (const func of existingFunctions) {
				func({ id, action, type, data, socket, reply });
			}
		}
	}

	checkIfResponsePayload({
		requests,
		responses,
		payload,
	}: {
		requests: RPCPayload[];
		responses: RPCPayload[];
		payload: RPCPayload;
	}) {
		const acceptedResponseActions = requests.map((r) => r.action);
		if (acceptedResponseActions.indexOf(payload.action) !== -1) {
			responses.push(payload);
		}
	}

	receive(params: {
		data?: unknown;
		message: string;
		ws: WebSocketWithClientId;
	}) {
		const { requests, responses } = this;
		const sarus = this.sarus;
		const { message, ws } = this.setMessageAndSocket({ sarus, params });
		const socket = sarus || ws;
		try {
			const payload = decode(message) as RPCPayload;
			this.checkIfResponsePayload({ requests, responses, payload });
			const { id, action, type, data, noReply } = payload;
			const reply = this.setupReply({ id, action, socket, noReply });
			if (this.isNotARequest({ requests, id })) {
				this.callFunctionsOrReturnError({
					action,
					type,
					id,
					reply,
					data,
					socket,
				});
			}
		} catch (err) {
			console.error(err);
			return err;
		}
	}

	removeItemFromQueue(item: unknown, queue: unknown[]) {
		const itemIndex = queue.indexOf(item);
		if (itemIndex !== -1) {
			queue.splice(itemIndex, 1);
		}
	}

	cleanupRPCCall(response: RPCPayload) {
		const { requests, responses } = this;
		const request = requests.find((r) => r.id === response.id);
		this.removeItemFromQueue(response, responses);
		this.removeItemFromQueue(request, requests);
	}

	waitForReply({
		interval,
		responses,
		noReply,
		id,
		action,
	}: {
		interval: NodeJS.Timeout | undefined;
		responses: RPCPayload[];
		noReply?: boolean;
		id: string;
		action: string;
	}) {
		return new Promise<unknown>((resolve, reject) => {
			if (noReply) return resolve(null);
			interval = setInterval(() => {
				const response = responses.find(
					(r) => r.id === id && r.action === action,
				);
				if (response) {
					if (interval) clearInterval(interval);
					if (response.type === "response") {
						resolve(response.data);
					} else if (response.type === "error") {
						reject(response.error);
					}
					this.cleanupRPCCall(response);
				}
			}, 10);
		});
	}

	send({ ws, action, data, noReply }: SendArgs) {
		const { responses } = this;
		const id = uuidv4();
		const type = "request";
		const payload: RPCPayload = {
			id,
			action,
			type,
			data,
			noReply,
		};
		if (!noReply) this.requests.push(payload);
		const socket = this.sarus || ws;
		if (socket) socket.send(encode(payload));
		let interval: NodeJS.Timeout | undefined;
		return this.waitForReply({ interval, responses, noReply, id, action });
	}
}

export default RPC;
