"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export type RealtimeStatus = "disconnected" | "connecting" | "connected";

export interface RealtimeEvent {
  type: string;
  data?: Record<string, unknown>;
  detail?: string;
  client_message_id?: string | null;
}

interface UseRealtimeSocketOptions {
  enabled: boolean;
  onEvent: (event: RealtimeEvent) => void;
}

function resolveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (apiBase && apiBase.startsWith("http")) {
    return apiBase.replace(/^http/, "ws").replace(/\/+$/, "") + "/ws";
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `ws://${window.location.hostname}:8001/api/v1/ws`;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/v1/ws`;
  }
  return "ws://localhost:8001/api/v1/ws";
}

export function useRealtimeSocket({ enabled, onEvent }: UseRealtimeSocketOptions) {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const sendEvent = useCallback((payload: Record<string, unknown>): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const clearTimers = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };

    const connect = async () => {
      if (cancelled) return;

      let ticketQuery = "";
      try {
        const res = await apiFetch<{ ticket: string }>("/auth/ws-ticket");
        if (res?.ticket) {
          ticketQuery = `?token=${encodeURIComponent(res.ticket)}`;
        }
      } catch {
        // Not authenticated on backend; skip WS connection cleanly
        if (!cancelled) setStatus("disconnected");
        return;
      }

      if (cancelled) return;
      setStatus("connecting");

      const ws = new WebSocket(`${resolveWsUrl()}${ticketQuery}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        retryCountRef.current = 0;
        setStatus("connected");
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data) as RealtimeEvent;
          if (parsed.type === "pong") return;
          onEventRef.current(parsed);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        clearTimers();
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        if (cancelled) return;
        setStatus("disconnected");
        const delayMs = Math.min(1000 * 2 ** retryCountRef.current, 15000);
        retryCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delayMs);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  return { status: enabled ? status : "disconnected", sendEvent };
}
