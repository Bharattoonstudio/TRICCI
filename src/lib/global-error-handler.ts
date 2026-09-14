/**
 * Global error handler for uncaught errors and unhandled promise rejections.
 * Call setupGlobalErrorHandler() once in your app entry point.
 */

interface ErrorLog {
  type: 'error' | 'unhandledRejection';
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
}

const errorQueue: ErrorLog[] = [];
const MAX_ERRORS_IN_QUEUE = 10;

/**
 * Log an error to the server asynchronously
 */
function sendErrorToServer(log: ErrorLog) {
  if (errorQueue.length >= MAX_ERRORS_IN_QUEUE) {
    errorQueue.shift();
  }
  errorQueue.push(log);

  // Send via sendBeacon to ensure delivery even on page unload
  navigator.sendBeacon('/api/logs/error', JSON.stringify(log));
}

/**
 * Setup global error handlers for uncaught exceptions and unhandled rejections
 */
export function setupGlobalErrorHandler() {
  // Catch uncaught synchronous errors
  window.addEventListener('error', (event: ErrorEvent) => {
    console.error('Uncaught error:', event.error);
    
    sendErrorToServer({
      type: 'error',
      message: event.error?.message || event.message || 'Unknown error',
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    console.error('Unhandled promise rejection:', reason);

    sendErrorToServer({
      type: 'unhandledRejection',
      message,
      stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  });
}

/**
 * Get queued errors (useful for debugging or sending in batch)
 */
export function getErrorQueue() {
  return [...errorQueue];
}

/**
 * Clear error queue
 */
export function clearErrorQueue() {
  errorQueue.length = 0;
}
