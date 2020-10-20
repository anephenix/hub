# CHANGELOG

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
