import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/store/hooks";
import { annotationCreated, taskAssigned, taskUpdated, wsStatusChanged } from "@/store/tasksSlice";
import { WS_URL } from "@/lib/config";
import type { TaskFeedEvent } from "@/lib/types";

const MAX_BACKOFF_MS = 15_000;
const BASE_BACKOFF_MS = 500;

function isTaskFeedEvent(value: unknown): value is TaskFeedEvent {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as Record<string, unknown>).kind;
  return kind === "task.updated" || kind === "task.assigned" || kind === "annotation.created";
}

/**
 * Subscribes to the mock server's live event stream and dispatches
 * normalized actions into the tasks slice.
 *
 * Reconnect strategy: exponential backoff (500ms, 1s, 2s, 4s, ... capped at
 * 15s), reset to the base delay on every successful connection. This is a
 * long-lived internal console, so we reconnect indefinitely rather than
 * giving up after N attempts -- a temporarily-restarted mock server (or a
 * laptop coming back from sleep) shouldn't require a page reload.
 *
 * Unknown-task handling: events routinely reference tasks outside the
 * currently loaded page (see mock server's t120+ events). We don't drop
 * these -- the slice's taskUpdated/taskAssigned/annotationCreated reducers
 * create a minimal stub or a pending bump, so no event is silently lost,
 * and the row appears/upgrades if that task is ever loaded or paged to.
 */
export function useTaskFeed(): void {
  const dispatch = useAppDispatch();
  const attemptRef = useRef(0);
  const closedByUsRef = useRef(false);

  useEffect(() => {
    closedByUsRef.current = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      dispatch(wsStatusChanged(attemptRef.current === 0 ? "connecting" : "reconnecting"));
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        attemptRef.current = 0;
        dispatch(wsStatusChanged("open"));
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          console.warn("[useTaskFeed] received non-JSON message, ignoring", event.data);
          return;
        }
        if (!isTaskFeedEvent(parsed)) {
          console.warn("[useTaskFeed] received unrecognized event shape, ignoring", parsed);
          return;
        }
        switch (parsed.kind) {
          case "task.updated":
            dispatch(taskUpdated(parsed.payload));
            break;
          case "task.assigned":
            dispatch(taskAssigned(parsed.payload));
            break;
          case "annotation.created":
            dispatch(annotationCreated(parsed.payload));
            break;
        }
      };

      socket.onclose = () => {
        if (closedByUsRef.current) return;
        dispatch(wsStatusChanged("reconnecting"));
        const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attemptRef.current);
        attemptRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // onclose will fire right after; reconnect logic lives there so we
        // don't schedule it twice.
        socket?.close();
      };
    }

    connect();

    return () => {
      closedByUsRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      dispatch(wsStatusChanged("closed"));
    };
  }, [dispatch]);
}
