const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function poll(conditionFn, maxAttempts = 15, intervalMs = 2000) {
    for (let i = 1; i <= maxAttempts; i++) {
        try {
            const result = await conditionFn();
            if (result) return result;
        } catch (err) {
            // ignore, keep polling
        }
        await wait(intervalMs);
    }
    throw new Error(`Condition not met after ${maxAttempts} attempts (${maxAttempts * intervalMs}ms)`);
}

module.exports = { poll, wait };