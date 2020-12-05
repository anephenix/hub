# TODO List

### Completed features

-   [x] Add a message handler to intercept and react to channel messages
-   [x] DRY up the publish command on server/rpc
-   [x] See if you can DRY up the RPC class used on both the server and the client
-   [x] Make retryConnectionDelay true by default on Sarus, and publish an update for that library
-   [x] Check that published messages don't get queued up on the server's requests list for rpc.
-   [x] Support the option to submit a RPC request without requiring a response (send only)
-   [x] Support data persistence using Redis
-   [x] Support publish message relay across multiple WebSocket servers (horizontal scaling)
-   [x] Simpy rpc action add by passing id, action, and type as defaults into the reply function, which can be overriden.
-   [x] Think about how to handle unsubscribes so that they get handled appropriately.
-   [x] Think about how to support channel subscriptions where the client needs some form of authentication/authorization
-   [x] Wildcard channel configurations
-   [x] clientCanPublish channel configuration option
-   [x] Client url origin filtering
-   [x] Client IP Address filtering

### Features to implement

-   [ ] Kick clients and ban them if required

-   [ ] Client input scanning
-   [ ] Think about how to support message catchup for clients that disconnect and then reconnect.
-   [ ] Think about how to publish to all clients, and whether that needs simple support (i.e. hub.pubsub.publishToAll and hubClient.addGlobalMessageHandler)
-   [ ] A broadcast server api call, with an option to handle on the client
-   [ ] Clean up the code to grade A on CodeClimate
-   [ ] Convert to TypeScript
-   [ ] Think about performance testing
-   [ ] Create a WebSite with examples for people to use
-   [ ] Create a presentation for presenting to LNUG or other JavaScript groups online

### Notes

-   If you are using the in-memory pubsub and need to restart the process, it does not know about the previous channel subscribers, which means that the dashboard example won't resume without a page reload.
-   Need to think about how you prune disconnected clients (clients that are no longer active or connected but have some empty persisted data in the backend).
