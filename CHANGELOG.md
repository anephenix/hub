# CHANGELOG

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
