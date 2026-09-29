/**
 * Unified Logger System for Aetheria AI-Town
 * Provides level-based logging (debug, info, warn, error),
 * environment-aware suppression (DEV vs PROD),
 * and intelligent error deduplication & throttling.
 */

const isDev = Boolean(import.meta.env.DEV);

// Error deduplication & throttling state
interface ThrottleRecord {
  count: number;
  lastLoggedTime: number;
  timer: any;
  lastArgs: any[];
}

const errorThrottles = new Map<string, ThrottleRecord>();
const THROTTLE_WINDOW_MS = 2500; // 2.5s window
const MAX_IMMEDIATE_LOGS = 2; // Allow first 2 occurrences immediately

// Dev Metrics Tracker (Section 7)
export interface DevMetrics {
  simulationTicks: number;
  renders: number;
  geminiCalls: number;
  firestoreReads: number;
  firestoreWrites: number;
  firebaseErrors: number;
  apiErrors: number;
  activeBubbles: number;
}

export const devMetrics: DevMetrics = {
  simulationTicks: 0,
  renders: 0,
  geminiCalls: 0,
  firestoreReads: 0,
  firestoreWrites: 0,
  firebaseErrors: 0,
  apiErrors: 0,
  activeBubbles: 0
};

export const logger = {
  debug(tag: string, ...args: any[]) {
    if (isDev) {
      console.debug(`%c[${tag}]`, 'color: #9d8cff; font-weight: bold;', ...args);
    }
  },

  info(tag: string, ...args: any[]) {
    if (isDev) {
      console.info(`%c[${tag}]`, 'color: #73c7e8; font-weight: bold;', ...args);
    }
  },

  warn(tag: string, ...args: any[]) {
    console.warn(`%c[${tag}]`, 'color: #ffc97a; font-weight: bold;', ...args);
  },

  error(tag: string, error: unknown, ...additionalArgs: any[]) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const key = `${tag}::${errorMsg}`;
    const now = Date.now();

    devMetrics.firebaseErrors++;

    const existing = errorThrottles.get(key);
    if (!existing) {
      // First time seeing this error
      console.error(`%c[${tag}]`, 'color: #f43f5e; font-weight: bold;', error, ...additionalArgs);
      errorThrottles.set(key, {
        count: 1,
        lastLoggedTime: now,
        timer: null,
        lastArgs: additionalArgs
      });
      return;
    }

    existing.count++;

    if (now - existing.lastLoggedTime < THROTTLE_WINDOW_MS) {
      // Within throttle window
      if (existing.count <= MAX_IMMEDIATE_LOGS) {
        console.error(`%c[${tag}]`, 'color: #f43f5e; font-weight: bold;', error, ...additionalArgs);
      } else if (!existing.timer) {
        // Schedule summary log at end of window
        existing.timer = setTimeout(() => {
          if (existing.count > MAX_IMMEDIATE_LOGS) {
            console.error(
              `%c[${tag}] [Repeated ${existing.count} times in last ${Math.round(THROTTLE_WINDOW_MS / 1000)}s]`,
              'color: #f43f5e; font-weight: bold;',
              errorMsg
            );
          }
          errorThrottles.delete(key);
        }, THROTTLE_WINDOW_MS);
      }
    } else {
      // Window expired, reset
      if (existing.timer) clearTimeout(existing.timer);
      console.error(
        `%c[${tag}] [Repeated ${existing.count} times]`,
        'color: #f43f5e; font-weight: bold;',
        error,
        ...additionalArgs
      );
      errorThrottles.delete(key);
    }
  },

  recordMetric(key: keyof DevMetrics, delta = 1) {
    if (isDev && key in devMetrics) {
      devMetrics[key] += delta;
    }
  }
};
