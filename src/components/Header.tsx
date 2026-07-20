"use client";

import { useAppSelector } from "@/store/hooks";
import { WS_URL, isLocalhostMisconfigured } from "@/lib/config";

const WS_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  open: "Live",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
};

/** Just a title and a connection indicator -- this app is a single screen,
 * so there's no navigation to house in a sidebar or topbar shell. */
export function Header() {
  const wsStatus = useAppSelector((s) => s.tasks.wsStatus);
  const isLive = wsStatus === "open";
  // A WS stuck endlessly reconnecting looks identical whether the mock
  // server is genuinely down or was just never pointed at a real host from
  // this deployment -- the hover title disambiguates without adding UI.
  const hint =
    !isLive && isLocalhostMisconfigured()
      ? `Trying to reach ${WS_URL} -- set NEXT_PUBLIC_WS_URL to a publicly hosted wss:// URL for this deployment.`
      : undefined;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-navy-700">Annotation Activity Console</h1>
      <span
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-soft"
        title={hint}
      >
        <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"}`} />
        {WS_LABEL[wsStatus] ?? wsStatus}
      </span>
    </header>
  );
}