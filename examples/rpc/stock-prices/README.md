# RPC Stock Prices example

This is an example of an RPC server and CLI client that allows the client to 
fetch prices for a stock based on its symbol. 

The server runs and simulates market price movements as a "random walk", whilst 
the client (as an interactive REPL) makes RPC calls to the server to fetch the
latest price for a stock symbol.

The stocks that you can get prices for are:

- AMZN
- META
- MSFT
- AAPL
- GOOGL
- NVDA
- NFLX

These are prices as of end of day's trading June 23rd 2025, and the prices 
update in a "random walk" fashion to simulate market price movements. 

NOTE - They are not the live prices of the stock at this current time.

## Dependencies

## Running the server

```shell
node server.js
```

The shell will print out the prices of the stock every second. You can edit 
the server.js file and comment out the console.log statement if you wish.

### Running the client

The client runs as an interactive REPL, and you can run it like this:

```shell
node cli-client.js
```

When the client runs, you will see some colourful logging output of 
WebSocket messages being received by the client.

to fetch prices of a stock (say AAPL), run this in the REPL:

```shell
await getPrice('AAPL');
```

And you should expect to see output similar to this:

```
{"id":"8b280f9b-7915-4ed8-b7fa-1c5986628155","action":"get-price","type":"response","data":{"stock":208.72}}
208.72
```

To exit the client, run `exit()`;