Feature: FetchMissedMessages
	In order to catch up on messages missed while disconnected
	As a client
	I want to fetch missed messages for the channels that I am subscribed to

	Scenario: Fetch missed messages, delivered individually as catchup message events (the default)
		Given a new client opens a connection to the server
		And the client subscribes to the channel "handball"
		And the server can supply missed messages for the channel "handball" after message id "2"
		When the client fetches missed messages for the channel "handball" since message id "2"
		Then the client should receive the message "Match postponed" for the channel "handball" as a catchup message
		And the client should receive the message "New kickoff time confirmed" for the channel "handball" as a catchup message

	Scenario: Fetch missed messages, delivered in bulk in the response
		Given a new client opens a connection to the server
		And the client subscribes to the channel "netball"
		And the server can supply missed messages for the channel "netball" after message id "2"
		When the client fetches missed messages for the channel "netball" since message id "2" with bulk delivery
		Then the client should receive the missed messages for the channel "netball" in the response

	Scenario: Fail to fetch missed messages for a channel that the client is not subscribed to
		Given a new client opens a connection to the server
		When the client fetches missed messages for the channel "archery" since message id "1", but is not subscribed
		Then the client should receive an error response saying that they must be subscribed to the channel
