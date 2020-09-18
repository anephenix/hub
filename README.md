# Hub

A Node.js WebSocket server with added features

### Dependencies

- Node.js
- Redis

### Install

```shell
npm i @anephenix/hub
```

### Features

- Remote Procedure Calls (RPC)
- Publish/Subscribe (PubSub)
- Enhanced Security options
    - Websocket Secure protocol support
    - Client input scanning
    - Client origin filtering
    - Client IP Address filtering
    - Kick clients and ban them if required

### Usage

```javascript
// Dependencies
const Hub = require('@anephenix/hub');

// Initialise an instance of Hub
const hub = new Hub({
    protocol: 'wss', // can be either ws or wss
    port: 8443, // The port to listen on
    // If the protocol is WSS, you'll need to pass the key and certificate files for the certificate 
    certs: {
        key: '/path/to/ssl-key', // SSL key
        cert: '/path/to/ssl-cert' // SSL cert
    },
    // You can restrict the origins from which clients are allowed to connect from
    allowedOrigins: ['https://localhost:3000'],
    // You can restrict the IP addresses from which clients are allowed to connect from
    allowedIPAddresses: ['127.0.0.1','192.168.0.1'],
    // This allows you to store key data in either local memory or a data storage tool, such as Redis
    storage: {
        type: 'redis',
        options: {
        host: 'localhost'
        port: 6379'
    },
    log: {
        type: 'file',
        filePath: '/path/to/logFile.log',
    }
});

hub.on('connection', (ws) => {

    // Here, we ask if the client has an id
    // If they reply that they do, great, we can simply continue
    // If not, then we generate a client id for them, and send it to them
    // The client id is used for subscribing to/from channels, as WebSockets
    // have no concept of an id, and are simply data pipes.

    // A single browser could have multiple WebSocket connections during a,
    // session, but the client id ensures that they don't have to resubscribe
    // to channels every time they need to recreate a WebSocket connection.

    ws.on('message', () => {
        // What to do when a client sends a message to the server
        // We would want to do the following:
        // - check that the message input is valid and not a malicious payload
        // - check if the client has an allowed origin and ip address
        // 
        // Once that is done, we can then do client id checking
    });

    ws.on('close', () => {
        // What to do when a client connection is closed
    });
});

// Get Hub to start listening on the port in the configuration
await hub.listen();
```