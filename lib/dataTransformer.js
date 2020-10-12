/*
	Data Transformer
	----------------

	Handles encoding/decoding data that is sent via WebSockets. It is 
	currently just a wrapper around JSON parse/stringify, but the plan is to 
	support other formats like ProtoBuffers and MessagePack in the future.
*/

/*
    Encodes the data for transmission over WebSocket

    @params     data    *           The data to encode
    @returns            String
*/
function encode(data) {
	return JSON.stringify(data);
}

/*
    Decodes the data that was received over the WebSocket

    @params     data    String      The data to decode
    @returns            *
*/
function decode(data) {
	return JSON.parse(data);
}

module.exports = { encode, decode };
