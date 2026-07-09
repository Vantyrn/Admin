"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Global cache to prevent flickering and loading states on navigation
const realtimeCache = new Map();

/**
 * Custom hook for real-time data fetching with smart polling and patching.
 * @param {string} apiUrl - The API endpoint to poll.
 * @param {object} options - Configuration options.
 */
export function useRealtime(apiUrl, options = {}) {
  const { 
    patchKey = 'id',
    interval = 10000, // Default changed to 10s
    toastConfig = null,
    onDataUpdate = null
  } = options;

  // Initialize from cache for instant "stale" render
  const [data, setData] = useState(realtimeCache.get(apiUrl) || null);
  const [loading, setLoading] = useState(!realtimeCache.has(apiUrl));
  const [connected, setConnected] = useState(false);
  const dataRef = useRef(realtimeCache.get(apiUrl) || null);
  const isInitialLoad = useRef(!realtimeCache.has(apiUrl));
  // Once the session is gone, stop polling so we don't throw a 401 every tick.
  const stoppedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (stoppedRef.current) return;

    // Optimization: Skip fetching if tab is hidden
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    try {
      const res = await fetch(apiUrl, { cache: 'no-store' });

      // Session expired / not authenticated: stop polling and bounce to login
      // once, instead of surfacing a 401 console error on every interval tick.
      if (res.status === 401) {
        stoppedRef.current = true;
        setConnected(false);
        setLoading(false);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin-login')) {
          window.location.href = '/admin-login';
        }
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const newData = await res.json();

      if (isInitialLoad.current) {
        setData(newData);
        dataRef.current = newData;
        realtimeCache.set(apiUrl, newData);
        setLoading(false);
        setConnected(true);
        isInitialLoad.current = false;
        if (onDataUpdate) onDataUpdate(newData);
      } else {
        // Smart Patching Logic
        if (Array.isArray(newData) && Array.isArray(dataRef.current)) {
          const oldData = dataRef.current;
          const oldMap = new Map(oldData.map(item => [item[patchKey], item]));
          
          // Detect additions for toasts
          if (toastConfig) {
            newData.forEach(newItem => {
              if (!oldMap.has(newItem[patchKey])) {
                toast.success(toastConfig.new(newItem), {
                  description: toastConfig.description?.(newItem) || ""
                });
              }
            });
          }

          // Deep comparison to avoid unnecessary state updates
          const hasChanged = JSON.stringify(newData) !== JSON.stringify(oldData);
          if (hasChanged) {
            setData(newData);
            dataRef.current = newData;
            realtimeCache.set(apiUrl, newData);
            if (onDataUpdate) onDataUpdate(newData);
          }
        } else {
          // Object-based patching (for stats)
          const hasChanged = JSON.stringify(newData) !== JSON.stringify(dataRef.current);
          if (hasChanged) {
            setData(newData);
            dataRef.current = newData;
            realtimeCache.set(apiUrl, newData);
            if (onDataUpdate) onDataUpdate(newData);
          }
        }
        setConnected(true);
      }
    } catch (err) {
      // A network-level failure rejects fetch() with a TypeError ("Failed to fetch") —
      // e.g. the dev server hot-reloading, a brief offline, or a request interrupted by
      // navigation. For a polling hook this is transient and self-heals on the next tick,
      // so downgrade it to a warning instead of a console.error that trips the dev error
      // overlay / Sentry every blip. Genuine (non-network) errors are still logged loudly.
      if (err instanceof TypeError) {
        console.warn(`[Realtime] Transient network error polling ${apiUrl}; will retry.`);
      } else {
        console.error(`[Realtime Polling Error - ${apiUrl}]:`, err);
      }
      setConnected(false);
    }
  }, [apiUrl, patchKey, toastConfig, onDataUpdate]);

  useEffect(() => {
    // Reset state when apiUrl changes
    isInitialLoad.current = true;
    stoppedRef.current = false;
    setLoading(true);
    
    fetchData();
    const timer = setInterval(fetchData, interval);

    // Also fetch immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [apiUrl, interval]);

  return { data, loading, connected, mutate: fetchData };
}
