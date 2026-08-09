import { useEffect, useRef, useCallback } from 'react';

/**
 * useAutoLock — Automatically locks the vault after a period of inactivity.
 *
 * @param isActive       Whether the vault is currently unlocked (hook is only armed when true)
 * @param timeoutMinutes Inactivity timeout in minutes (default: 5)
 * @param onLock         Callback to lock the vault
 * @param onWarn         Callback called 30 seconds before auto-lock fires (show a warning toast)
 */
export function useAutoLock(
  isActive: boolean,
  timeoutMinutes: number = 5,
  onLock: () => void,
  onWarn?: (secondsLeft: number) => void,
) {
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WARN_BEFORE_MS = 30_000; // warn 30s before locking

  const clearTimers = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!isActive) return;
    clearTimers();

    const totalMs = timeoutMinutes * 60 * 1000;

    // Schedule warning 30s before lock
    if (onWarn && totalMs > WARN_BEFORE_MS) {
      warnTimerRef.current = setTimeout(() => {
        onWarn(30);
      }, totalMs - WARN_BEFORE_MS);
    }

    // Schedule lock
    lockTimerRef.current = setTimeout(() => {
      onLock();
    }, totalMs);
  }, [isActive, timeoutMinutes, onLock, onWarn, clearTimers]);

  useEffect(() => {
    if (!isActive) {
      clearTimers();
      return;
    }

    // Activity events that reset the timer
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

    const handleActivity = () => resetTimer();

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    resetTimer(); // arm immediately when vault is unlocked

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearTimers();
    };
  }, [isActive, resetTimer, clearTimers]);
}
