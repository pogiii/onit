/**
 * Options for configuring retry behavior
 */
interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    retries?: number;
    /** Base delay between retries in milliseconds (default: 1000) */
    delay?: number;
    /** Exponential backoff factor (default: 2) */
    backoff?: number;
    /** Custom function to determine if a retry should be attempted */
    shouldRetry?: (error: Error, attempt: number) => boolean;
    /** Callback function executed before each retry attempt */
    onRetry?: (error: Error, attempt: number) => void;
  }
  
  const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
    retries: 3,
    delay: 1000,
    backoff: 2,
  };
  
  async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function isPromise<T>(value: unknown): value is Promise<T> {
    return value instanceof Promise;
  }
  
  function isFunction<T>(value: unknown): value is () => T {
    return typeof value === 'function';
  }
  
  /**
   * Executes an async function with retry capability and error handling
   * @param fn - Promise or async function to execute
   * @param options - Retry configuration options
   * @returns Tuple of [error, result]
   */
  export const catchError = async <T>(
    fn: Promise<T> | (() => Promise<T>),
    options?: RetryOptions
  ): Promise<[Error | null, T | null]> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let attempt = 1; // Start at 1 to count first attempt
  
    const shouldRetry = (error: Error): boolean => {
      if (opts.shouldRetry) {
        return opts.shouldRetry(error, attempt);
      }
      return attempt <= opts.retries;
    };
  
    do {
      try {
        const result = await (isPromise(fn) ? fn : fn());
        return [null, result];
      } catch (error) {
        lastError = error as Error;
  
        if (shouldRetry(lastError)) {
          opts.onRetry?.(lastError, attempt);
  
          // Calculate delay with exponential backoff
          const backoffDelay = opts.delay * Math.pow(opts.backoff, attempt - 1);
          await wait(backoffDelay);
          attempt++;
          continue;
        }
        break;
      }
    } while (attempt <= opts.retries);
  
    return [lastError, null];
  };
  
  /**
   * Executes a synchronous function with retry capability and error handling
   * @param syncFn - Synchronous function or value
   * @param options - Retry configuration options
   * @returns Tuple of [error, result]
   */
  export const catchErrorSync = <T>(
    syncFn: T | (() => T),
    options?: RetryOptions
  ): [Error | null, T | null] => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let attempt = 1; // Start at 1 to count first attempt
  
    const shouldRetry = (error: Error): boolean => {
      if (opts.shouldRetry) {
        return opts.shouldRetry(error, attempt);
      }
      return attempt <= opts.retries;
    };
  
    do {
      try {
        const result = isFunction<T>(syncFn) ? syncFn() : syncFn;
        return [null, result];
      } catch (error) {
        lastError = error as Error;
  
        if (shouldRetry(lastError)) {
          opts.onRetry?.(lastError, attempt);
          attempt++;
          continue;
        }
        break;
      }
    } while (attempt <= opts.retries);
  
    return [lastError, null];
  };
  