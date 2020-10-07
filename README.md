# Hub

A Node.js WebSocket server with added features

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

```javascript
// Dependencies
const Hub = require('@anephenix/hub');
const hub = new Hub({ port: 4000 });
await hub.listen();
```

### License and Credits

&copy; 2020 Anephenix OÜ. All rights reserved. Hub is licensed under the MIT licence.
