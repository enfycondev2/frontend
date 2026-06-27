/** Returns true for network-level timeouts — retrying these is pointless. */
export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; isAxiosError?: boolean };
  return e.isAxiosError === true && (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT");
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;

      // Don't retry timeouts — the server is unreachable or blocking us.
      // Exponential backoff won't help and wastes ~60s per district.
      if (isTimeoutError(error)) {
        throw error;
      }

      if (attempt >= maxRetries) {
        throw error;
      }
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Maximum retries exceeded");
}
