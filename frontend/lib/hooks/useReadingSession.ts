'use client';

import { useEffect, useRef, useCallback } from 'react';
import { readingAPI } from '@/lib/api/reading';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Hook to track reading time for a document.
 * Starts a session on mount, sends heartbeats every 30s,
 * and sends a final heartbeat on unmount.
 */
export function useReadingSession(docId: string) {
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      await readingAPI.heartbeat(sessionIdRef.current);
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const startSession = async () => {
      try {
        const session = await readingAPI.startSession(docId);
        if (isCancelled) return;
        sessionIdRef.current = session.id;
        console.log(`Reading session ${session.id} started for doc ${docId}`);

        // Start heartbeat interval
        intervalRef.current = setInterval(() => {
          sendHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);
      } catch (err) {
        console.error('Failed to start reading session:', err);
      }
    };

    startSession();

    // Cleanup: send final heartbeat and clear interval
    return () => {
      isCancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Send one last heartbeat before unmount
      if (sessionIdRef.current) {
        readingAPI.heartbeat(sessionIdRef.current).catch(() => {});
      }
    };
  }, [docId, sendHeartbeat]);

  return { sessionId: sessionIdRef.current };
}
