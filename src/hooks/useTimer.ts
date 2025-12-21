"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook to track elapsed time for long-running processes
 * Returns elapsed time in seconds and formatted time string
 */
export function useTimer(isActive: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);

      const interval = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    } else {
      startTimeRef.current = null;
      setElapsedSeconds(0);
    }
  }, [isActive]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return {
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    showCounter: elapsedSeconds >= 5, // Show counter after 5 seconds
  };
}
