"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store/store";
import { fetchTasks, hydrateFromCache } from "@/store/tasksSlice";
import { useTaskFeed } from "@/hooks/useTaskFeed";

/** Runs inside the Provider so it can dispatch/select; keeps the feed
 * subscription and bootstrap fetch out of the top-level Providers component. */
function Bootstrap({ children }: { children: ReactNode }) {
  useTaskFeed();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    const store = storeRef.current!;
    // Cache-then-revalidate: show whatever we had in IndexedDB immediately,
    // then kick off the real network fetch which always overwrites it.
    void store.dispatch(hydrateFromCache()).then(() => {
      void store.dispatch(fetchTasks({ page: 1, pageSize: 20 }));
    });
  }, []);

  return (
    <Provider store={storeRef.current}>
      <Bootstrap>{children}</Bootstrap>
    </Provider>
  );
}
