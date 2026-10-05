const READ_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);
export async function retrySafeRead<T>(operation: string, run: () => Promise<T>, transient: (error: unknown) => boolean, wait: () => Promise<void>) {
  try { return await run(); } catch (error) {
    if (!READ_OPERATIONS.has(operation) || !transient(error)) throw error;
    await wait();
    return run();
  }
}
