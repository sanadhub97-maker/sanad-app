/** Share only overlapping reads; settled results are never cached. */
export function singleFlight<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (pending) return pending;
    const current = Promise.resolve().then(load);
    pending = current;
    const clear = () => { if (pending === current) pending = null; };
    void current.then(clear, clear);
    return current;
  };
}
