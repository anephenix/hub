# Chat example

Here is some code that allows you to run a simple chat server and some clients that can connect to it.

To run the chat example, do the following:

```
node chatServer.js
```

This will run the chat server, which will be listening locally on port 3005.

```
node clientOne.js
```

This will run a terminal-based client that will allow you to set your name, 
what channel you wish to join, and then send and receive messages to that 
channel.

You can type emoji into the messages using :<NAME_OF_EMOJI>:, like for examople :tomato: for 🍅.

If you want to quit the client, type `/quit`.