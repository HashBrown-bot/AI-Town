/**
 * Unified Logger System for Aetheria AI-Town
 * Implements: logger.info, logger.debug, logger.warn, logger.error
 *
 * Rules & Features:
 * 1. Environment-Aware:
 *    - Production environments (!import.meta.env.DEV) suppress all logs except warnings & errors.
 *    - Development environment allows necessary debug and info logs.
 * 2. Automatic Throttling & Deduplication:
 *    - Automatically identifies repeated log messages within a 2.5-second window.
 *    - Emits first occurrences immediately, throttles duplicates, and aggregates counts
 *      (e.g., "[Repeated 20 times in last 3s]") to prevent simulation tick and network spam.
 * 3. Diagnostics & Telemetry:
 *    - Maintains dev metrics counters (simulationTicks, renders, firestoreReads, etc.)
 *      for HUD inspection without polluting the console.
 */

const isDev = Boolean(import.meta.env.DEV);

interface ThrottleRecord {
  count: number;
  lastLoggedTime: number;
  timer: any;
  leadArgs: any[];
}

const throttles = new Map<string, ThrottleRecord>();
const THROTTLE_WINDOW_MS = 2500; // 2.5s suppression window
const MAX_IMMEDIATE_LOGS = 2; // Allow first 2 duplicates immediately before throttling

// Dev Metrics Tracker
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
  activeBubbles: 0,
};

function serializeArgs(args: any[]): string {
  try {
    return args
      .map((arg) => {
        if (arg instanceof Error) return `${arg.name}:${arg.message}`;
        if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(arg);
        }
        return String(arg);
      })
      .join(' ')
      .slice(0, 300);
  } catch {
    return String(args[0] || '');
  }
}

function logWithThrottle(
  level: 'debug' | 'info' | 'warn' | 'error',
  color: string,
  tag: string,
  args: any[]
) {
  // In production, suppress debug and info completely to prevent simulation loop log noise
  if (!isDev && (level === 'debug' || level === 'info')) {
    return;
  }

  const key = `${level}::${tag}::${serializeArgs(args)}`;
  const now = Date.now();
  const existing = throttles.get(key);

  const consoleFn =
    level === 'debug'
      ? console.debug
      : level === 'info'
      ? console.info
      : level === 'warn'
      ? console.warn
      : console.error;

  const badge = `%c[${tag}]`;
  const badgeStyle = `color: ${color}; font-weight: bold;`;

  if (!existing) {
    // First occurrence
    consoleFn(badge, badgeStyle, ...args);
    throttles.set(key, {
      count: 1,
      lastLoggedTime: now,
      timer: null,
      leadArgs: args,
    });
    return;
  }

  existing.count++;

  if (now - existing.lastLoggedTime < THROTTLE_WINDOW_MS) {
    // Within throttle window
    if (existing.count <= MAX_IMMEDIATE_LOGS) {
      consoleFn(badge, badgeStyle, ...args);
    } else if (!existing.timer) {
      // Schedule aggregate count summary log at end of window
      existing.timer = setTimeout(() => {
        if (existing.count > MAX_IMMEDIATE_LOGS) {
          consoleFn(
            `%c[${tag}] [Repeated ${existing.count} times in last ${Math.round(THROTTLE_WINDOW_MS / 1000)}s]`,
            badgeStyle,
            ...existing.leadArgs
          );
        }
        throttles.delete(key);
      }, THROTTLE_WINDOW_MS);
    }
  } else {
    // Window expired, flush and reset
    if (existing.timer) clearTimeout(existing.timer);
    consoleFn(
      `%c[${tag}] [Repeated ${existing.count} times]`,
      badgeStyle,
      ...args
    );
    throttles.delete(key);
  }
}

export const logger = {
  /**
   * Debug level logging (development only, throttled for repeated messages).
   */
  debug(tag: string, ...args: any[]) {
    logWithThrottle('debug', '#9d8cff', tag, args);
  },

  /**
   * Info level logging (development only, throttled for repeated messages).
   */
  info(tag: string, ...args: any[]) {
    logWithThrottle('info', '#73c7e8', tag, args);
  },

  /**
   * Warning level logging (active in all environments, throttled for repeated messages).
   */
  warn(tag: string, ...args: any[]) {
    logWithThrottle('warn', '#ffc97a', tag, args);
  },

  /**
   * Error level logging (active in all environments, throttled for repeated messages, increments error metrics).
   */
  error(tag: string, error: unknown, ...additionalArgs: any[]) {
    if (tag === 'Firebase' || tag === 'Firestore') {
      devMetrics.firebaseErrors++;
    } else {
      devMetrics.apiErrors++;
    }

    logWithThrottle('error', '#f43f5e', tag, [error, ...additionalArgs]);
  },

  /**
   * Record metrics for developer HUD without generating console noise.
   */
  recordMetric(key: keyof DevMetrics, delta = 1) {
    if (isDev && key in devMetrics) {
      devMetrics[key] += delta;
    }
  },
};
