import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/config";

export type SummaryStreamStatus = "idle" | "streaming" | "done" | "error";

export interface SummaryStreamState {
  text: string;
  status: SummaryStreamStatus;
  error: string | null;
}

/**
 * Consumes the SSE summary endpoint for a given task id, accumulating the
 * markdown text as chunks arrive so the caller can render it incrementally.
 *
 * - Switching `taskId` (including to `null`) closes the previous EventSource
 *   immediately and resets state, so a slow old stream can never clobber a
 *   newer task's text ("switching tasks mid-stream cancels the old one").
 * - A `done` SSE event or the connection erroring both terminate the stream;
 *   errors are surfaced via `status: "error"` rather than thrown, since this
 *   runs outside the render phase.
 */
export function useSummaryStream(taskId: string | null): SummaryStreamState {
  const [state, setState] = useState<SummaryStreamState>({ text: "", status: "idle", error: null });
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    sourceRef.current?.close();
    sourceRef.current = null;

    if (!taskId) {
      setState({ text: "", status: "idle", error: null });
      return;
    }

    setState({ text: "", status: "streaming", error: null });

    const source = new EventSource(`${API_BASE}/api/tasks/${encodeURIComponent(taskId)}/summary`);
    sourceRef.current = source;

    source.onmessage = (event: MessageEvent<string>) => {
      let chunk: string;
      try {
        chunk = JSON.parse(event.data);
      } catch {
        chunk = event.data;
      }
      setState((prev) => ({ ...prev, text: prev.text + chunk }));
    };

    source.addEventListener("done", () => {
      setState((prev) => ({ ...prev, status: "done" }));
      source.close();
    });

    source.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", error: "Summary stream disconnected." }));
      source.close();
    };

    return () => {
      source.close();
      if (sourceRef.current === source) sourceRef.current = null;
    };
  }, [taskId]);

  return state;
}
