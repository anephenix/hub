/*
    This is the config used by both the server and the client.

    You can change to have the server run on a different port by 
    changing the port value here, and if you are hosting the 
    server remotely, uu can change the url value to the 
    remote address.
*/
const config = { 
    port: 3005,
    url: 'ws://localhost:3005'
};

module.exports = config;