export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = (error as {response?: {status?: number}})?.response?.status;
  if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  return failureCount < 1;
}
