Feature: PubSub
  In order to receive and send messages via a channel
  As a client
  I want to publish to, subscribe to and unsubscribe from channels 

    @wip
	Scenario: Subscribe to a channel
      Given a new client opens a connection to the server
	  And the client subscribes to the channel "news"
	  Then the server should receive a request to subscribe the client to the channel "news"
	  And the server should subscribe the client to the channel "news"
	  And the client should receive a reply indicating that they are now subscribed to the channel "news" 

    Scenario: Receive messages for a subscribed channel
      Given pending

	Scenario: Publish to a channel, including sender as recipient
	  Given pending

	Scenario: Publish to a channel, excluding sender as recipient
	  Given pending

	Scenario: Unsubscribe from a channel
	  Given pending