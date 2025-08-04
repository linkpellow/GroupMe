/**
 * Simple logger utility
 * In production, consider using Winston or similar logging library
 */

const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
};

export default logger;

// Add periodic memory usage logging (disabled in test environments)
// The interval can be controlled via MEMORY_LOG_INTERVAL_MS (default 30000) and disabled entirely by setting ENABLE_MEM_LOG="false"
export const startMemoryLogging = () => {
  if (process.env.ENABLE_MEM_LOG === 'false' || process.env.NODE_ENV === 'test') return;
  const interval = Number(process.env.MEMORY_LOG_INTERVAL_MS) || 30000;
  logger.info(`Memory logging enabled – interval ${interval} ms`);
  setInterval(() => {
    const mem = process.memoryUsage();
    logger.info(
      `Memory usage – rss ${(mem.rss / 1048576).toFixed(1)} MB | heapUsed ${(
        mem.heapUsed / 1048576
      ).toFixed(1)} MB | external ${(mem.external / 1048576).toFixed(1)} MB`
    );
  }, interval).unref(); // unref so it doesn't keep the event loop alive
};
