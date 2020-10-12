# Hub

A Node.js WebSocket server and client with added features

[![npm version](https://badge.fury.io/js/%40anephenix%2Fhub.svg)](https://badge.fury.io/js/%40anephenix%2Fhub) [![CircleCI](https://circleci.com/gh/anephenix/hub.svg?style=shield)](https://circleci.com/gh/anephenix/hub)
[![Coverage Status](https://coveralls.io/repos/github/anephenix/hub/badge.svg?branch=master)](https://coveralls.io/github/anephenix/hub?branch=master) [![Maintainability](https://api.codeclimate.com/v1/badges/d8b19a24baca1d1b42f2/maintainability)](https://codeclimate.com/github/anephenix/hub/maintainability)

### Dependencies

-   Node.js

### Install

```shell
npm i @anephenix/hub
```

### Features

-   PubSub (Publish/Subscribe)
-   RPC (Remote Procedure Call)

More upcoming features are listed in the TODO.md file.

### Running tests

```shell
npm t
npm run cucumber
```

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
// Dependencies
const { HubClient } = require('@anephenix/hub');

// HubClient uses Sarus for the WebSocket client,
// here is the config for that
const sarusConfig = { url: 'ws://localhost:4000' };

// Create an instance of HubClient with the config
// for Sarus
const hubClient = new HubClient({ sarusConfig });
```

The client can be loaded via either code on the browser, or
as part of a Node.js program (see examples folder for more details).

#### RPC (Remote Procedure Calls)

Hub has support for defining RPC functions, but with an added twist. Traditionally RPC functions are defined on the server and called from the client.

Hub supports that common use case, but also supports defining RPC functions on the client that the server can call.

We will show examples of both below:

##### Creating an RPC function on the server

```javascript
const { encode } = require('@anephenix/hub/lib/dataTransformer');

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
const getPriceFunction = ({ id, action, type, data, ws }) => {
	if (type === 'request') {
		let cryptocurrency = cryptocurrencies[data.cryptocurrency];
		const response = {
			id,
			action,
			type: 'response',
			data: { cryptocurrency },
		};
		ws.send(encode(response));
	}
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
const { encode } = require('@anephenix/hub/lib/dataTransformer');
// Create an RPC function to call on the client
const getEnvironment = ({ id, type, action, sarus }) => {
	// Get some details from a Node CLI running on a server
	const { arch, platform, version } = process;
	if (type === 'request') {
		const payload = {
			id,
			action,
			type: 'response',
			data: { arch, platform, version },
		};
		sarus.send(encode(payload));
	}
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

#### PubSub (Publish/Subscribe)

Hub has support for PubSub, where the client subscribes to channels and unsubscribes from them, and where both the client and the server can publish messages to those channels.

##### Subscribing to a channel

```javascript
await hubClient.subscribe('news');
```

##### Unsubscribing to a channel

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
hub.pubsub.publish({
	data: { channel, message },
});
```

### License and Credits

&copy; 2020 Anephenix OÜ. All rights reserved. Hub is licensed under the MIT licence.
