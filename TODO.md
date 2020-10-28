#TODO

Get these features in place:

-   Enhanced Security options

    -   Client input scanning
    -   Client origin filtering
    -   Client IP Address filtering
    -   Kick clients and ban them if required

-   Support this kind of usage example

```javascript
// Initialise an instance of Hub
const hub = new Hub({
	port: 8443, // The port to listen on

	// You can restrict the origins from which clients are allowed to connect from
	allowedOrigins: ['https://localhost:3000'],
	// You can restrict the IP addresses from which clients are allowed to connect from
	allowedIPAddresses: ['127.0.0.1', '192.168.0.1'],
	log: {
		type: 'file',
		filePath: '/path/to/logFile.log',
	},
});
```
