import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import httpShutdown from "http-shutdown";

const directory = path.join(process.cwd(), "support", "client"); // Change this to your directory*
const port = 3000;

// Function to serve static files
function serveStaticFile(req, res) {
	let filePath = path.join(directory, req.url === "/" ? "index.html" : req.url);
	const extname = String(path.extname(filePath)).toLowerCase();
	const mimeTypes = {
		".html": "text/html",
		".js": "application/javascript",
		".css": "text/css",
	};

	// Security to prevent directory traversal for malicious requests
	try {
		filePath = fs.realpathSync(path.resolve(directory, filePath));
		if (!filePath.startsWith(directory)) {
			res.statusCode = 403;
			res.end();
			return;
		}
	} catch (error) {
		console.error(error);
		res.statusCode = 403;
		res.end();
		return;
	}

	const contentType = mimeTypes[extname] || "application/octet-stream";

	fs.readFile(filePath, (error, content) => {
		if (error) {
			if (error.code === "ENOENT") {
				res.writeHead(404, { "Content-Type": "text/html" });
				res.end("404 Not Found", "utf-8");
			} else {
				res.writeHead(500);
				res.end(`Server Error: ${error.code}`);
			}
		} else {
			res.writeHead(200, { "Content-Type": contentType });
			res.end(content, "utf-8");
		}
	});
}

// Create an HTTP server
const server = http.createServer(serveStaticFile);

// Wrap the server with http-shutdown for graceful shutdown
const shutdownableServer = httpShutdown(server);

// Function to start the server
function startServer() {
	return new Promise((resolve, reject) => {
		server.listen(port, (err) => {
			if (err) {
				return reject(err);
			}
			console.log(`Server is running at http://localhost:${port}`);
			resolve();
		});
	});
}

// Function to stop the server
function stopServer() {
	return new Promise((resolve, reject) => {
		shutdownableServer.shutdown((err) => {
			if (err) {
				return reject(err);
			}
			console.log("Server has been shut down");
			resolve();
		});
	});
}

// Export the stopServer function to be used elsewhere
export { startServer, stopServer };
