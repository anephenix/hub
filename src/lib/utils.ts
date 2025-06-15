const isNode = (): boolean => {
	try {
		// @ts-ignore
		window;
		return false;
	} catch (err) {
		return true;
	}
};

export { isNode };
