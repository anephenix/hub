const termkit = require("terminal-kit");
const terminal = termkit.terminal;
const ChatClient = require("./chatClient");
const config = require("./config");
const emoji = require("node-emoji");

let room, name;
let client;
const messages = [];
const MESSAGE_AREA_HEIGHT = terminal.height - 3; // Define message area height
let scrollIndex = 0; // Track the current scroll position

const printMessage = (data) => {
	const { name, message } = data;
	messages.push({ name, message: emoji.emojify(message) });
	if (scrollIndex < messages.length - MESSAGE_AREA_HEIGHT) {
		scrollIndex++; // Auto-scroll down for new messages
	}
	refreshMessages();
};

const refreshMessages = () => {
	terminal.moveTo(1, 1).eraseDisplayBelow();

	// Display messages based on scrollIndex and MESSAGE_AREA_HEIGHT
	const visibleMessages = messages.slice(
		scrollIndex,
		scrollIndex + MESSAGE_AREA_HEIGHT,
	);
	visibleMessages.forEach((msg) => {
		terminal(`${msg.name}: ${msg.message}\n`);
	});

	terminal.moveTo(1, terminal.height - 2);
	terminal.yellow(`Type your message below (press Enter to send):`);
	terminal.moveTo(1, terminal.height - 1);
};

const setupChatClient = async () => {
	client = new ChatClient({ url: config.url });
	await client.join(room);
	client.onMessage(printMessage);
};

const startChat = async () => {
	await setupChatClient();

	terminal.clear();
	refreshMessages(); // Initial rendering of message area

	enableScrolling(); // Enable mouse-based scrolling
	readInput(); // Start reading user input
};

const enableScrolling = () => {
	terminal.grabInput({ mouse: "button" });

	terminal.on("mouse", (name, data) => {
		if (data.y < terminal.height - 2) {
			// Ensure scrolling only affects message area
			if (data.mwheelup) {
				// Scroll up
				scrollIndex = Math.max(0, scrollIndex - 1);
			} else if (data.mwheeldown) {
				// Scroll down
				scrollIndex = Math.min(
					messages.length - MESSAGE_AREA_HEIGHT,
					scrollIndex + 1,
				);
			}
			refreshMessages();
		}
	});
};

const readInput = () => {
	terminal.inputField(
		{ cursorPosition: terminal.height - 1 },
		async (error, input) => {
			if (error) {
				console.error("Error reading input:", error);
				process.exit(1);
			}

			if (input.toLowerCase() === "/quit") {
				terminal.clear();
				process.exit(0);
			} else if (input.trim()) {
				await client.send({ name, message: input });
			}

			terminal.moveTo(1, terminal.height - 1).eraseLine();
			readInput();
		},
	);
};

// Prompt user for room and name
const promptUser = async () => {
	terminal.yellow("What room do you want to join?\n");
	terminal.inputField((error, roomName) => {
		if (error) return process.exit(1);
		room = roomName.trim();

		terminal.yellow("\nWhat is your name?\n");
		terminal.inputField((error, userName) => {
			if (error) return process.exit(1);
			name = userName.trim();
			startChat();
		});
	});
};

promptUser();
