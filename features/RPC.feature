Feature: RPC
	In order to perform actions and exchange data between the client and server
	As a WebSocket client or server
	I want to make an RPC call to perform an action, and get back a response

	Scenario: Make an RPC call to the server from the client
		Given a new client opens a connection to the server
		And an RPC action exists on the server
		When the client calls that RPC action on the server
		Then the client should receive a response from the server

	Scenario: Make an RPC call to the server from the client, but get an error back
		Given a new client opens a connection to the server
		Given an RPC action exists on the server
		When the client calls the wrong RPC action on the server
		Then the client should receive an error response from the server saying that the action was not found

	Scenario: Make an RPC call to the client from the server
		Given a new client opens a connection to the server
		Given an RPC action exists on the client
		When the server calls that RPC action on the client
		Then the server should receive a response from the client

	Scenario: Make an RPC call to the client from the server, but get an error back
		Given a new client opens a connection to the server
		Given an RPC action exists on the client
		When the server calls the wrong RPC action on the client
		Then the server should receive an error response from the client saying that the action was not found
