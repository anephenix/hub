// Import the @anephenix/hub library
import Hub from "../../../dist/esm/index.js";
import config from "./config.js";

// Set up the Hub server to listen on  port as from the config
/*
    Note - for data persistence in case of server restarts,
    we recommend using Redis as a datastore option to maintain
    persistence, as well as enable scaling:

    https://github.com/anephenix/hub?tab=readme-ov-file#handling-client--channel-subscriptions-data
*/
const { port } = config;
const hub = new Hub({ port });

// Start listening
hub.listen();

console.log(`Server running on port ${port}`);
