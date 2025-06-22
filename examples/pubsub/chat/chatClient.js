const { HubClient } = require("../../../index");

// Helper functions
const delayUntil = (condition, delay) => {
	return new Promise((resolve) => {
		const check = () => {
			if (condition()) {
				resolve();
			} else {
				setTimeout(check, delay);
			}
		};
		check();
	});
};

class ChatClient {
	constructor({ url }) {
		this.client = new HubClient({ url });
		this.hooks = {};
		this.isConnected = () => this.client.sarus.state.kind === "connected";
		this.channel = null;
		this.messageAttachFunction = (data) => {
			if (this.hooks.message) {
				this.hooks.message.forEach((callback) => callback(data));
			}
		};
	}

	async join(channel) {
		try {
			await delayUntil(() => this.isConnected(), 50);
			this.channel = channel;
			await this.client.subscribe(this.channel);
			this.client.addChannelMessageHandler(
				this.channel,
				this.messageAttachFunction,
			);
		} catch (error) {
			console.error(error);
		}
	}

	onMessage(callback) {
		if (!this.hooks.message) {
			this.hooks.message = [callback];
		} else {
			this.hooks.message.push(callback);
		}
	}

	async send(contents) {
		try {
			await this.client.publish(this.channel, contents);
		} catch (error) {
			console.error(error);
		}
	}

	leave() {
		try {
			this.client.unsubscribe(this.channel);
			this.client.removeChannelMessageHandler(
				this.channel,
				this.messageAttachFunction,
			);
		} catch (error) {
			console.error(error);
		}
	}
}

module.exports = ChatClient;
