import assert from "node:assert";
import { delayUntil } from "../../src/helpers/delay";
import { describe, it } from "vitest";

describe("delay helpers", () => {
	describe("#delayUntil", () => {
		it("should throw an error if the timeout threshold is reached", async () => {
			try {
				await delayUntil(() => {
					return false;
				}, 200);
				assert(false, "Should not reach this point");
			} catch (err: unknown) {
				assert.strictEqual(
					(err as Error).message,
					"Condition did not resolve before the timeout",
				);
			}
		});

		it("should have support for the condition function to be a standard function", async () => {
			const condition = () => true;
			const result = await delayUntil(condition);
			assert.strictEqual(result, true);
		});

		it("should have support for the condition function to be async", async () => {
			let count = 0;
			const timeout = 50;
			const totalWait = 200;
			const expectedCount = Math.floor(totalWait / timeout) - 1;

			const condition = async () => {
				await new Promise((resolve) => setTimeout(resolve, timeout));
				count++;
				return count >= expectedCount;
			};

			const result = await delayUntil(condition, totalWait);
			assert.strictEqual(result, true);
			assert.strictEqual(count, expectedCount);
		});

	});
});
