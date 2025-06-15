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
	});
});
