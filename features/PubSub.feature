Feature: PubSub
	In order to receive and send messages via a channel
	As a client
	I want to publish to, subscribe to and unsubscribe from channels

	Scenario: Subscribe to a channel
		Given a new client opens a connection to the server
		And the client subscribes to the channel "news"
		Then the server should receive a request to subscribe the client to the channel "news"
		And the server should subscribe the client to the channel "news"
		And the client should receive a reply indicating that they are now subscribed to the channel "news"

	Scenario: Receive messages for a subscribed channel
		Given a new client opens a connection to the server
		And the client subscribes to the channel "sport"
		When the server publishes the message "Liverpool won" to the channel "sport"
		Then the client should receive the message "Liverpool won" for the channel "sport"

	Scenario: Publish to a channel, including sender as recipient
		Given a new client opens a connection to the server
		And the client subscribes to the channel "news"
		When the client publishes the message "hello world" to the channel "news"
		Then the client should receive the message "hello world" for the channel "news"

	Scenario: Publish to a channel, excluding sender as recipient
		Given a new client opens a connection to the server
		And the client subscribes to the channel "news"
		When the client publishes the message "hello world" to the channel "news" to all other subscribers
		Then the client should not receive the message "hello world" for the channel "news"

	Scenario: Unsubscribe from a channel
		Given a new client opens a connection to the server
		And the client subscribes to the channel "sport"
		When the server publishes the message "Liverpool won" to the channel "sport"
		Then the client should receive the message "Liverpool won" for the channel "sport"
		When the client unsubscribes from the channel "sport"
		Then the server should receive a request to unsubscribe the client from the channel "sport"
		And the server should unsubscribe the client from the channel "sport"
		And the client should receive a reply indicating that they are have unsubscribed from the channel "sport"
		And another client connects and subscribes to "sport"
		And the server publishes the message "Man Utd drew" to the channel "sport"
		Then the client should not receive the message "Man Utd drew" for the channel "sport"
		And the other client should receive the message "Man Utd drew" for the channel "sport"

	Scenario: Subscribe to a channel that requires authentication
		Given the server has the channel "news" that requires authentication with the password "sudo"
		And a new client opens a connection to the server
		And the client subscribes to the channel "news" with the password "sudo"
		Then the server should receive a request to subscribe the client to the channel "news" with the password "sudo"
		And the server should subscribe the client to the channel "news"
		And the client should receive a reply indicating that they are now subscribed to the channel "news"

	Scenario: Fail to subscribe to a channel that requires authentication
		Given the server has the channel "news" that requires authentication with the password "sudo"
		And a new client opens a connection to the server
		And the client subscribes to the channel "news"
		Then the server should receive a request to subscribe the client to the channel "news"
		And the server should reply with an error saying that the channel requires authentication
		And the client should not be subscribed to the channel "news"