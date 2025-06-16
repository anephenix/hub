/*
	Used to delay execution for a given duration
*/
const delay = (duration: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, duration));

/*
	Used to delay execution until a condition is met or a timeout occurs.
*/
const delayUntil = (
	condition: () => boolean | Promise<boolean>,
	timeout?: number,
): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		const timeAtStart = Date.now();
		const interval = setInterval(async () => {
			let result = condition();
			if (result instanceof Promise) {
				result = await result;
			}
			if (result) {
				resolve(true);
				clearInterval(interval);
			} else {
				const currentTime = Date.now();
				if (timeout !== undefined && currentTime - timeAtStart > timeout) {
					reject(new Error("Condition did not resolve before the timeout"));
					clearInterval(interval);
				}
			}
		}, 50);
	});
};

export { delay, delayUntil };