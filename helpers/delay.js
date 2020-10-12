const delay = (duration) =>
	new Promise((resolve) => setTimeout(resolve, duration));

const delayUntil = (condition, timeout) => {
	return new Promise((resolve, reject) => {
		let interval;
		const timeAtStart = new Date();
		interval = setInterval(() => {
			if (condition()) {
				resolve(true);
				clearInterval(interval);
			} else {
				const currentTime = new Date();
				if (timeout && ((currentTime - timeAtStart) > timeAtStart)) {
					reject(false);
					clearInterval(interval);
				}
			}
		});
	});
};

module.exports = { delay, delayUntil};
