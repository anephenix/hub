const delay = (duration) =>
	new Promise((resolve) => setTimeout(resolve, duration));

const delayUntil = (condition, timeout) => {
	return new Promise((resolve, reject) => {
		const timeAtStart = new Date().getTime();
		const interval = setInterval(() => {
			if (condition()) {
				resolve(true);
				clearInterval(interval);
			} else {
				const currentTime = new Date().getTime();
				if (timeout && currentTime - timeAtStart > timeout) {
					reject(
						new Error(
							'Condition did not resolve before the timeout'
						)
					);
					clearInterval(interval);
				}
			}
		});
	});
};

module.exports = { delay, delayUntil };
