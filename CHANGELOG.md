# CHANGELOG

### Friday, April 21, 2023

-   Updated dependencies

### Wednesday, April 12, 2023

-   Updated dependencies

### Wednesday, April 12, 2023

-   Updated dependencies

### Wednesday, April 12, 2023

-   Updated dependencies

### 0.0.25 - Tuesday 11th April, 2023

-   Updated dependencies

### 0.0.23 - Tuesday 15th November, 2022

-   Updated dependencies

### 0.0.22 - Wednesday 29th September, 2021

-   Updated dependencies

### 0.0.21 - Saturday 14th August, 2021

-   Added support for SessionStorage in server-side rendering context
-   Updated dependencies

### 0.0.20 - Wendesday 30th December, 2020

-   Added support for kicking a client off the server
-   Added support for banning a client from the server
-   Developers can add/remove ban rules for clients

### 0.0.19 - Tuesday 1st December, 2020

-   Allowed allowedIpAddresses feature to restrict where clients can connect from

### 0.0.18 - Sunday 29th November, 2020

-   Added allowedOrigins feature to restrict where clients can connect from

### 0.0.17 - Friday 30th October, 2020

-   Small fix for loading the client in a browser context
-   Updated dependencies

### 0.0.16 - Thursday 29th October, 2020

-   Refactored the code to improve readability
-   Fixed a bug with wildcard channel matching
-   Fixed a bug with the delayUntil helper function

### 0.0.15 - Saturday 24th October, 2020

-   Added support for passing a http/https server with options to Hub

### 0.0.14 - Friday 23rd October, 2020

-   Added support for clientCanPublish checks on channel configurations

### 0.0.13 - Thursday 22nd October, 2020

-   Added support for adding wildcard channel configurations
-   Added support for removing channel configurations

### 0.0.12 - Tuesday 20th October, 2020

-   Developers can now configure channels to require authentication
-   Clients can subscribe to channels that require authentication

### 0.0.11 - Sunday 18th October, 2020

-   Clients are automatically resubscribed to channels when they reconnect
-   Clients are automatically unsubscribed from channels when they disconnect

### 0.0.10 - Saturday 17th October, 2020

-   Adapted the rpc reply function so that it includes some parameters and simplifies the interface

### 0.0.9 - Friday 16th October, 2020

-   Added horizontal scaling support for message publishing using Redis

### 0.0.8 - Wednesday 14th October, 2020

-   Added the ability to store client/subscriptions data in Redis

### 0.0.7 - Wednesday 14th October, 2020

-   Added a way to make RPC requests without requiring a response in return

### 0.0.6 - Wednesday 14th October, 2020

-   Changed how config options are passed to the HubClient

### 0.0.5 - Tuesday 13th October, 2020

-   Clients can now handle messages for channels with a single function call
-   Clients can remove and list those message handlers

### 0.0.4 - Monday 12th October, 2020

-   Pushed a fix where an NPM dependency was classed as a devDependency by mistake

### 0.0.3 - Monday 12th October, 2020

-   Added RPC functionality
-   Reworked the client identification and pubsub features to be extensions on top of RPC
-   Added HubClient library for client-side support
-   Enabled HubClient to be used on both Node.js and the browser.

### 0.0.2 - Thursday 1st October, 2020

-   Fixed a bug where publishing a message to a channel without any subscribers caused an error

### 0.0.1 - Thursday 1st October, 2020

-   Support for PubSub (in-memory)
