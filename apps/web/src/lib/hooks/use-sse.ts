"use client";

import { useEffect, useRef, useCallback } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useAuth } from "@clerk/nextjs";

interface UseSSEOptions<T> {
  url: string;
  enabled?: boolean;
  onMessage: (data: T) => void;
  onError?: (error: unknown) => void;
}

export function useSSE<T>({ url, enabled = true, onMessage, onError }: UseSSEOptions<T>) {
  const controllerRef = useRef<AbortController | null>(null);
  const { getToken } = useAuth();

  const connect = useCallback(async () => {
    if (!enabled) return;

    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    const token = await getToken();
    if (!token) return;

    fetchEventSource(url, {
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      onmessage(ev) {
        if (ev.data) {
          try {
            const parsed = JSON.parse(ev.data) as T;
            onMessage(parsed);
          } catch {
            // ignore non-JSON messages
          }
        }
      },
      onerror(err) {
        onError?.(err);
      },
      openWhenHidden: true,
    });
  }, [url, enabled, getToken, onMessage, onError]);

  useEffect(() => {
    connect();
    return () => controllerRef.current?.abort();
  }, [connect]);
}
