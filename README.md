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

Hub has support for defining RPC functions that can exist on either
the server or the client. 

TODO - flesh out more details.

### License and Credits

&copy; 2020 Anephenix OÜ. All rights reserved. Hub is licensed under the MIT licence.
