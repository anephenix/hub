// Dependencies
import { pastel } from "gradient-string";

export const enableMessageLogger = (sarus) => {
	const messages = [];
	const logMessage = (event) => {
		const message = JSON.parse(event.data);
		messages.push(message);
		console.log(pastel(JSON.stringify(message)));
	};

	sarus.on("message", logMessage);
};
