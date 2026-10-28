import { useEffect, useRef } from 'react';
import { logger } from './logger';

// Serialize changing resident/economy snapshots at most once a second.
// Flush the latest snapshot on pagehide and unmount; storage failures must not stop the town.
export function useLocalPersistence(key: string, value: unknown) {
  const latest = useRef(value);
  const dirty = useRef(true);
  useEffect(() => { latest.current = value; dirty.current = true; }, [value]);
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      try {
        localStorage.setItem(key, JSON.stringify(latest.current));
        dirty.current = false;
      } catch (error) {
        logger.warn('Storage', `Could not save ${key}`, error);
      }
    };
    const timer = window.setInterval(flush, 1000);
    window.addEventListener('pagehide', flush);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [key]);
}
