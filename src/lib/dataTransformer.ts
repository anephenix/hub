/*
	Data Transformer
	----------------

	Handles encoding/decoding data that is sent via WebSockets. It is 
	currently just a wrapper around JSON parse/stringify, but the plan is to 
	support other formats like ProtoBuffers and MessagePack in the future.
*/

import type { DataType } from "./types";

/*
	Encodes the data for transmission over WebSocket
*/
function encode(data: DataType): string {
	return JSON.stringify(data);
}

/*
	Decodes the data that was received over the WebSocket
*/
function decode(data: string): DataType {
	return JSON.parse(data);
}

export { encode, decode };
