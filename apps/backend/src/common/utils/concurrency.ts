/**
 * Maps over `items` running at most `limit` invocations of `fn` at once. Unlike
 * `Promise.all(items.map(fn))` this caps in-flight work, so fetching N assets
 * never fires N simultaneous requests at the same upstream provider (which would
 * trip rate limits as the asset list grows). Order of results matches input.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker);
  await Promise.all(workers);
  return results;
}
