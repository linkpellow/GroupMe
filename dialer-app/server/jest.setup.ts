// @ts-nocheck
// Jest global setup: close mongoose and unref global timers to avoid open handle leaks
import mongoose from 'mongoose';

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch {
    // ignore
  }
  // Unref any intervals created during tests
  const handles = (process as any)._getActiveHandles?.() as any[];
  handles?.forEach((h) => {
    if (typeof h.unref === 'function') {
      try {
        h.unref();
      } catch {}
    }
  });
}); 