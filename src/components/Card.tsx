import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/** The one place card chrome (border, radius, shadow) is defined, so every
 * surface in the dashboard -- KPI cards, the task table, the detail panel --
 * shares the same visual language. */
export function Card({ children, padded = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-soft ${padded ? "p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}