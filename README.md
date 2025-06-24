# Hub

A Node.js WebSocket server and client with added features

[![npm version](https://badge.fury.io/js/%40anephenix%2Fhub.svg)](https://badge.fury.io/js/%40anephenix%2Fhub)
[![Node.js CI](https://github.com/anephenix/hub/actions/workflows/node.js.yml/badge.svg)](https://github.com/anephenix/hub/actions/workflows/node.js.yml) [![Socket Badge](https://socket.dev/api/badge/npm/package/@anephenix/hub)](https://socket.dev/npm/package/@anephenix/hub)

### Dependencies

-   Node.js (version 22 or greater)
-   Redis

### Install

```shell
npm i @anephenix/hub
```

### Features

-   Isomorphic WebSocket client support
-   Bi-directional RPC (Remote Procedure Call)
-   Request-only RPC calls
-   PubSub (Publish/Subscribe)
-   Automatically unsubscribe clients from channels on disconnect
-   Automatically resubscribe clients to channels on reconnect
-   Authenticated Channels
-   Restrict client channel publish capability on a per-client basis
-   Use an existing HTTP/HTTPS server with the WebSocket server
-   Allow client connections only from a list of url origins or ip addresses

### Usage

**Getting started**

-   [Starting a server](#starting-a-server)
-   [Loading a client in the browser](#loading-a-client-in-the-browser)
-   [Loading a client in Node.js](#loading-a-client-in-Node.js)

**RPC (Remote Procedure Calls)**

-   [Creating an RPC function on the server](#creating-an-rpc-function-on-the-server)
-   [Calling the RPC function from the client](#calling-the-rpc-function-from-the-client)
-   [Creating an RPC function on the client](#creating-an-rpc-function-on-the-client)
-   [Calling the RPC function from the server](#calling-the-rpc-function-from-the-server)
-   [Calling an RPC function without wanting a response back](#calling-an-rpc-function-without-wanting-a-response-back)

**PubSub (Publish/Subscribe)**

-   [Subscribing to a channel](#subscribing-to-a-channel)
-   [Unsubscribing from a channel](#unsubscribing-from-a-channel)
-   [Publishing a message from the client](#publishing-a-message-from-the-client)
-   [Publishing a message from the server](#publishing-a-message-from-the-server)
-   [Handling messages published for a channel](#handling-messages-published-for-a-channel)
-   [Removing message handlers for a channel](#removing-message-handlers-for-a-channel)

**Advanced PubSub**

-   [Handling client disconnects / reconnects](#handling-client-disconnects--reconnects)
-   [Handling client / channel subscriptions data](#handling-client--channel-subscriptions-data)
-   [Creating channels that require authentication](#creating-channels-that-require-authentication)
-   [Adding wildcard channels configurations](#adding-wildcard-channel-configurations)
-   [Enabling / disabling client publish capability](#enabling--disabling-client-publish-capability)

**Security**

-   [Using a secure server with Hub](#using-a-secure-server-with-hub)
-   [Restricting where WebSockets can connect from](#restricting-where-webSockets-can-connect-from)
-   [Kicking clients from the server](#kicking-clients-from-the-server)
-   [Banning clients from the server](#banning-clients-from-the-server)
-   [Adding / removing ban rules for clients](#adding-or-removing-ban-rules-for-clients)

#### Getting started

Here is how to get started quickly.

##### Starting a server

You can run the WebSocket server with this code snippet:

```javascript
// Dependencies
import Hub from '@anephenix/hub';

// Initialize hub to listen on port 4000
const hub = new Hub({ port: 4000 });

// Start listening
hub.listen();
```

##### Loading a client in the browser

And for the client, you can load this code:

```javascript
import HubClient from '@anephenix/hub/dist/lib/client/HubClient.browser.js'; // TODO - check and verify against published library

// Create an instance of HubClient
const hubClient = new HubClient({ url: 'ws://localhost:4000' });
```

HubClient uses [Sarus](https://sarus.anephenix.com) as the WebSocket client behind the scenes. If you want to
provide custom config options to Sarus, you can do so by using this code:

```javascript
// Create an instance of HubClient
const hubClient = new HubClient({
	url: 'ws://localhost:4000',
	sarusConfig: { retryConnectionDelay: 500 },
});
```

##### Loading a client in Node.js

Traditionally WebSocket clients connect from the web browser, but with Hub it is
possible to create a WebSocket client from a program running in Node.js. Here is
an example:

```javascript
// Dependencies
import repl from 'node:repl';
import HubClient from "@anephenix/hub/client";

// Initialise the client
const hubClient = new HubClient({ url: 'ws://localhost:3000' });

// Start the REPL and make hubClient available
const replInstance = repl.start('> ');
replInstance.context.hubClient = hubClient;
```

In the example above, you have Node.js repl with a Hub WebSocket client
connecting to a Hub WebSocket server running at localhost:3000. You can then
make calls from the client, such as getting the clientId of the client:

```javascript
hubClient.getClientId();
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

### Handling client disconnects / reconnects

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

### Handling client / channel subscriptions data

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

### Creating channels that require authentication

There will likely be cases where you want to use channels that only some users can subscribe to.

Hub provides a way to add private channels by providing channel configurtions to the server, like
in this example below:

```javascript
const channel = 'internal_announcements';
/*
 * Here we create a function that is called every time a client tries to
 * subscribe to a channel with a given name
 */
const authenticate = ({ socket, data }) => {
	// We have access to the socket of the client and the data they pass in
	// the subscribe request.
	//
	// isAllowed and isValid are just example functions that the developer can
	// define to perform the backend authentication for the subscription
	// request.
	if (isAllowed(data.channel, socket.clientId)) return true;
	if (isValidToken(data.token)) return true;
	// The function must return true is the client is allowed to subscribe
};

hub.pubsub.addChannelConfiguration({ channel, authenticate });
```

Then on the client, a user can subscribe and provide additional data to authenticate the channel

```javascript
const channel = 'internal_announcements';
const token = 'ahghaCeciawi5aefi5oolah6ahc8Yeeshie5opai';

await hubClient.subscribe(channel, { token });
```

### Adding wildcard channels configurations

There may be a case where you want to apply authentication across a range of channels without wanting
to add a channel configuration for each channel. There is support for wildcard channel configurations.

To illustrate, say you have a number of channels that are named like this:

-   dashboard_IeK0iithee
-   dashboard_aipe0Paith
-   dashboard_ETh2ielah1

Rather than having to add channel configurations for each channel, you can add a wildcard channel
configuration like this:

```javascript
// The wildcard matching character is *
const channel = 'dashboard_*';
const authenticate = ({ socket, data }) => {
	// For implementing authentication specific to each channel,
	// the channel is available in the data object
	if (isAllowed(data.channel, socket.clientId)) return true;
};

hub.pubsub.addChannelConfiguration({ channel, authenticate });
```

The `dashboard_*` wildcard channel will then run across all channels that have
a name containing `dashboard_` in them.

##### Enabling / disabling client publish capability

By default clients can publish messages to a channel. There may be some
channels where you do not want clients to be able to do this, or cases where
only some of the clients can publish messages.

In such cases, you can set a `clientCanPublish` boolean flag when adding a
channel configuration, like in the example below:

```javascript
const channel = 'announcements';
hub.pubsub.addChannelConfiguration({ channel, clientCanPublish: false });
```

If you need to enable/disable client publish on a client basis, you can pass a
function that receives the data and socket, like this:

```javascript
const channel = 'panel_discussion';
const clientCanPublish = ({ data, socket }) => {
	// Here you can inspect the publish data and the socket
	// of the client trying to publish
	//
	// isAllowed && isSafeToPublish are example functions
	//
	return isAllowed(socket.clientId) && isSafeToPublish(data.message);
};
hub.pubsub.addChannelConfiguration({ channel, clientCanPublish });
```

### Security

#### Using-a-secure-server-with-hub

Hub by default will initialise a HTTP server to attach the WebSocket server to.
However, it is recommended to use HTTPS to ensure that connections are secure.

Hub allows you 2 ways to setup the server to run on https - either pass an
instance of a https server to Hub:

```javascript
import https from 'node:https';
import fs from 'node:fs';
import Hub from '@anephenix/hub';

const serverOptions = {
	key: fs.readFileSync('PATH_TO_SSL_CERTIFICATE_KEY_FILE'),
	cert: fs.readFileSync('PATH_TO_SSL_CERTIFICATE_FILE');
};

const httpsServer = https.createServer(serverOptions);

const hub = await new Hub({port: 4000, server: httpsServer});
```

Alternatively, you can pass the string 'https' with the https
server options passed as a `serverOptions` property to Hub.

```javascript
import fs from 'node:fs';
import Hub from '@anephenix/hub';

const serverOptions = {
	key: fs.readFileSync('PATH_TO_SSL_CERTIFICATE_KEY_FILE'),
	cert: fs.readFileSync('PATH_TO_SSL_CERTIFICATE_FILE');
};

const hub = await new Hub({port: 4000, serverType: 'https', serverOptions });
```

When you use a https server with Hub, the url for connecting to the server
will use `wss://` instead of `ws://`.

#### Restricting where WebSockets can connect from

You can restrict the urls where WebSocket connections can be established by
passing an array of url origins to the `allowedOrigins` property for a server:

```javascript
import Hub from '@anephenix/hub';

const hub = await new Hub({
	port: 4000,
	allowedOrigins: ['landscape.anephenix.com'],
});
```

This means that any attempted connections from websites not hosted on
'landscape.anephenix.com' will be closed by the server.

Alernatively, you can also restrict the IP Addresses that clients can make
WebSocket connections from:

```javascript
import Hub from '@anephenix/hub';

const hub = await new Hub({ port: 4000, allowedIpAddresses: ['76.76.21.21'] });
```

#### Kicking clients from the server

There may be cases where a client is misbehaving, and you want to kick them off the server. You can do that with this code

```javascript
// Let's take the 1st client in the list of connected clients as an example
const ws = Array.from(hub.wss.clients)[0];
// Call kick
await hub.kick({ ws });
```

This will disable the client's automatic WebSocket reconnection code, and close the websocket connection.

However, if the person operating the client is versed in JavaScript, they can try and override the client code to reconnect again.

#### Banning clients from the server

You may want to ban a client from being able to reconnect again. You can do that by using this code:

```javascript
// Let's take the 1st client in the list of connected clients as an example
const ws = Array.from(hub.wss.clients)[0];
// Call kick
await hub.kickAndBan({ ws });
```

If the client attempts to reconnect again, then they will be kicked off automatically.

#### Adding or removing ban rules for clients

Client kicking/banning works by using a list of ban rules to check clients against.

A ban rule is a combination of a client's id, hostname and ip address.

You can add ban rules to the system via this code:

```javascript
const banRule = {
	clientId: 'da1441a8-691a-42db-bb45-c63c6b7bd7c7',
	host: 'signal.anephenix.com',
	ipAddress: '92.41.162.30',
};

await hub.dataStore.addBanRule(banRule);
```

A ban rule can consist of only one or two properties as well, say the ipAddress:

```javascript
const ipAddressBanRule = {
	ipAddress: '92.41.162.30',
};

await hub.dataStore.addBanRule(ipAddressBanRule);
```

To remove the ban rule, you can use this code:

```javascript
const banRule = {
	clientId: 'da1441a8-691a-42db-bb45-c63c6b7bd7c7',
	host: 'signal.anephenix.com',
	ipAddress: '92.41.162.30',
};

await hub.dataStore.removeBanRule(banRule);
```

To get the list of ban rules, you can use this code:

```javascript
await hub.dataStore.getBanRules();
```

To clear all of the ban rules:

```javascript
await hub.dataStore.clearBanRules();
```

### Running tests

To run tests, make sure that you have [mkcert](https://mkcert.dev) installed to generate some SSL certificates on your local machine.

```shell
npm run certs
npm t
npm run cucumber
```

### License and Credits

&copy; 2025 Anephenix OÜ. All rights reserved. Hub is licensed under the MIT licence.
