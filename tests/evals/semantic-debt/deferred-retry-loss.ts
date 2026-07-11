export function enqueueRetry(queue: string[], jobId: string): boolean {
  if (queue.length >= 100) {
    // TODO: persist overflow retries instead of dropping them.
    return false;
  }
  queue.push(jobId);
  return true;
}
