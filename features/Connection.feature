Feature: Connection handling
  In order to keep a persistent state of client subscriptions for a client across multiple connections
  As a server
  I want to assign client ids to WebSocket clients

  Scenario: Handle a new WebSocket client with no client id
    Given a new client opens a connection to the server
	  Then the server should request the client id from the client
	  When the client replies with no client id
	  Then the server should create a new client id, set it on the client connection, and send it to the client 

  Scenario: Handle a new WebSocket client with an existing client id
    Given a returning client opens a connection to the server
	  Then the server should request the client id from the client
	  When the client replies with their client id
	  Then the server should set that client id on the connection
