/**
 * Request Deduplication Utility
 * Tránh gọi API trùng lặp khi có nhiều requests cùng lúc cho cùng một endpoint
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplication {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Deduplicate request - nếu đã có request đang pending, return promise đó
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if there's a pending request
    const pending = this.pendingRequests.get(key);
    
    if (pending) {
      // Check if request is still valid (not timeout)
      const now = Date.now();
      if (now - pending.timestamp < this.REQUEST_TIMEOUT) {
        // Return existing promise
        return pending.promise;
      } else {
        // Request timeout, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Remove from pending after success
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Remove from pending after error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear pending request
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Check if request is pending
   */
  isPending(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (!pending) {
      return false;
    }

    const now = Date.now();
    if (now - pending.timestamp >= this.REQUEST_TIMEOUT) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }
}

export const requestDeduplication = new RequestDeduplication();








