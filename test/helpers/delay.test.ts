import assert from "node:assert";
import { delayUntil } from "../../src/helpers/delay";
import { describe, it } from "vitest";

describe("delay helpers", () => {
	describe("#delayUntil", () => {
		it("should throw an error if the timeout threshold is reached", async () => {
			try {
				await delayUntil(() => {
					return false;
				}, 1000);
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
			const result = await delayUntil(condition, 500);
			assert.strictEqual(result, true);
		});

		it("should have support for the condition function to be async", async () => {
			let count = 0;
			const condition = async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				count++;
				return count >= 3;
			};

			const result = await delayUntil(condition, 500);
			assert.strictEqual(result, true);
			assert.strictEqual(count, 3);
		});

	});
});
