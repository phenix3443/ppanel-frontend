import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";
import type { Tone } from "../lib/health";

const toneClass: Record<Tone, string> = {
  muted: "border-ds-border bg-ds-surface-raised text-ds-text-2",
  success: "border-transparent bg-ds-success-soft text-ds-success",
  warning: "border-transparent bg-ds-warning-soft text-ds-warning",
  danger: "border-transparent bg-ds-danger-soft text-ds-danger",
};

const dotClass: Record<Tone, string> = {
  muted: "bg-ds-text-3",
  success: "bg-ds-success",
  warning: "bg-ds-warning",
  danger: "bg-ds-danger",
};

/** Pill used for every running-status item; tone is exposed for tests. */
export function StatusBadge({
  tone,
  children,
  className,
  alert = false,
  ...rest
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
  alert?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold text-xs tabular-nums",
        toneClass[tone],
        className
      )}
      data-status-item
      data-tone={tone}
      {...rest}
    >
      {alert ? (
        <span aria-hidden="true" className="font-bold">
          !
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", dotClass[tone])}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
