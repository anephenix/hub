# Hub

A Node.js WebSocket server and client with added features

[![npm version](https://badge.fury.io/js/%40anephenix%2Fhub.svg)](https://badge.fury.io/js/%40anephenix%2Fhub) [![CircleCI](https://circleci.com/gh/anephenix/hub.svg?style=shield)](https://circleci.com/gh/anephenix/hub)
[![Coverage Status](https://coveralls.io/repos/github/anephenix/hub/badge.svg?branch=master)](https://coveralls.io/github/anephenix/hub?branch=master) [![Maintainability](https://api.codeclimate.com/v1/badges/d8b19a24baca1d1b42f2/maintainability)](https://codeclimate.com/github/anephenix/hub/maintainability)

### Dependencies

-   Node.js
-   Redis

### Install

```shell
npm i @anephenix/hub
```

### Features

-   PubSub (Publish/Subscribe)
-   RPC (Remote Procedure Call)

More upcoming features are listed in the TODO.md file.

### Usage

You can run the WebSocket server with this code snippet:

```javascript
// Dependencies
const { Hub } = require('@anephenix/hub');

// Initialize hub to listen on port 4000
const hub = new Hub({ port: 4000 });

// Start listening
hub.listen();
```

And for the client, you can load this code:

```javascript
/* Dependencies

	You will want to import just the HubClient library
	if you are using a library to import and transpile
	modules like WebPack for Next.js

*/
import HubClient from '@anephenix/hub/lib/client';

// Create an instance of HubClient
const hubClient = new HubClient({ url: 'ws://localhost:4000' });
```

HubClient uses Sarus as the WebSocket client behind the scenes. If you want to
provide custom config options to Sarus, you can do so by using this code:

```javascript
// Create an instance of HubClient
const hubClient = new HubClient({
	url: 'ws://localhost:4000',
	sarusConfig: { retryConnectionDelay: 500 },
});
```

The client can be loaded via either code on the browser, or
as part of a Node.js program.

```javascript
// Dependencies
const repl = require('repl');
const { HubClient } = require('@anephenix/hub');

// Initialise the client
const hubClient = new HubClient({ url: 'ws://localhost:3000' });

// Start the REPL and make hubClient available
const replInstance = repl.start('> ');
replInstance.context.hubClient = hubClient;
```

#### RPC (Remote Procedure Calls)

Hub has support for defining RPC functions, but with an added twist. Traditionally RPC functions are defined on the server and called from the client.

Hub supports that common use case, but also supports defining RPC functions on the client that the server can call.

We will show examples of both below:

##### Creating an RPC function on the server

```javascript
// Here's some example data of say cryptocurrency prices
const cryptocurrencies = {
	bitcoin: 11393.9,
	ethereum: 373.23,
	litecoin: 50.35,
};

// This simulates price movements, so that requests to the rpc
// function will returning changing prices.
setInterval(() => {
	Object.keys(cryptocurrencies).forEach((currency) => {
		const movement = Math.random() > 0.5 ? 1 : -1;
		const amount = Math.random();
		cryptocurrencies[currency] += movement * amount;
	});
}, 1000);

// Here we define the function to be added as an RPC function
const getPriceFunction = ({ data, reply }) => {
	let cryptocurrency = cryptocurrencies[data.cryptocurrency];
	reply({ data: { cryptocurrency } });
};

// We then attach that function to the RPC action 'get-price'
hub.rpc.add('get-price', getPriceFunction);
```

##### Calling the RPC function from the client

Now let's say you want to get the price for ethereum from the client:

```javascript
// Setup a request to get the price of ethereum
const request = {
	action: 'get-price',
	data: { cryptocurrency: 'ethereum' },
};
// Send that RPC request to the server
const { cryptocurrency } = await hubClient.rpc.send(request);

// Log the response from the data
console.log({ cryptocurrency });
```

##### Creating an RPC function on the client

```javascript
// Create an RPC function to call on the client
const getEnvironment = ({ reply }) => {
	// Get some details from a Node CLI running on a server
	const { arch, platform, version } = process;
	reply({ data: { arch, platform, version } });
};
// Add that function for the 'get-environment RPC call'
hubClient.rpc.add('get-environment', getEnvironment);
```

##### Calling the RPC function from the server

```javascript
// Fetch a WebSocket client, the first in the list
const ws = hubServer.wss.clients.values().next().value;
// Make an RPC request to that WebSocket client
const response = await hubServer.rpc.send({
	ws,
	action: 'get-environment',
});
```

##### Calling an RPC function without wanting a response back

In some cases you might want to make a request to an RPC function but not get
a reply back (such as sending an api key to a client). You can do that by
passing a `noReply` boolean to the `rpc.send` function, like in this example:

```javascript
const response = await hubServer.rpc.send({
	ws,
	action: 'set-api-key',
	data: { apiKey: 'eKam2aa3dah2jah4UtheeFaiPo6xahx5ohrohk5o' },
	noReply: true,
});
```

The response will be a `null` value.

#### PubSub (Publish/Subscribe)

Hub has support for PubSub, where the client subscribes to channels and unsubscribes from them, and where both the client and the server can publish messages to those channels.

##### Subscribing to a channel

```javascript
await hubClient.subscribe('news');
```

##### Unsubscribing from a channel

```javascript
await hubClient.unsubscribe('news');
```

##### Publishing a message from the client

```javascript
await hubClient.publish('news', 'Some biscuits are in the kitchen');
```

If you want to send the message to all subscribers but exclude the sender, you can pass a third argument to the call:

```javascript
await hubClient.publish('news', 'Some biscuits are in the kitchen', true);
```

##### Publishing a message from the server

```javascript
const channel = 'news';
const message = 'And cake too!';
(async () => {
	await hub.pubsub.publish({
		data: { channel, message },
	});
})();
```

##### Handling messages published for a channel

```javascript
const channel = 'weather';
const weatherUpdates = (message) => {
	const { temperature, conditions, humidity, wind } = message;
	console.log({ temperature, conditions, humidity, wind });
};
hubClient.addChannelMessageHandler(channel, weatherUpdates);
```

##### Removing message handlers for a channel

```javascript
hubClient.removeChannelMessageHandler(channel, weatherUpdates);

// You can also remove the function by referring to its name
function logger(message) {
	console.log({ message });
}

hubClient.removeChannelMessageHandler(channel, 'logger');
```

### Handling client disconnects/reconnects

When a client disconnects from the server, the client will automatically be
unsubscribed from any channels that they were subscribed to. The server
handles this, meaning that the list of clients subscribed to channels is
always up-to-date.

When a client reconnects to the server, the client will automatically be
resubscribed to the channels that they were originally subscribed to. The
client handles this, as it maintains a list of channels currently subscribed
to, which can be inspected here:

```javascript
hubClient.channels;
```

### Handling client/channel subscriptions data

Hub by default will store data about client/channel subscriptions in memory.
This makes it easy to get started with using the library without needing to
setup databases to store the data.

However, we recommend that you setup a database like Redis to store that
data, so that you don't lose the data if the Node.js process that is running
Hub ends.

You can setup Hub to use Redis as a data store for client/channels
subscriptions data, as demonstrated in the example below:

```javascript
const hub = new Hub({
	port: 4000,
	dataStoreType: 'redis',
	dataStoreOptions: {
		channelsKey: 'channels' // by default it is hub-channels
		clientsKey: 'clients' // by default it is hub-clients
		/*
		* This is the same config options that can be passed into the redis NPM
		* module, with details here:
		* https://www.npmjs.com/package/redis#options-object-properties
		*/
		redisConfig: {
			db: 1
		}
	}
});
```

The added benefit of using the Redis data store is that it supports horizontal scaling.

For example, say you have two instances of Hub (server A and server B), and two clients
(client A and client B). Both clients are subscribed to the channel 'news'.

If a message is published to the channel 'news' using server A, then the message will be
received by both servers A and B, and the message will be passed to clients that
are subscribers to that channel, in this case both Client A and client B.

This means that you don't have to worry about which clients are connected to which servers,
or which servers are receiving the publish actions. You can then run multiple instances of
Hub across multiple servers, and have a load balancer sit in front of the servers to handle
availability (making sure WebSocket connections go to available servers, and if a server
goes offline, that it can pass the reconnection attempt to another available server).

### Running tests

```shell
npm t
npm run cucumber
```

### License and Credits

&copy; 2020 Anephenix OÜ. All rights reserved. Hub is licensed under the MIT licence.
