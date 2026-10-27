import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Tone } from "../lib/health";
import { MISSING } from "./module-states";

const ICON_PATHS = {
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4M17.5 14.8c2 .6 3.4 2.4 3.9 5.2" />
    </>
  ),
  swap: <path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3" />,
  cloud: (
    <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18Z" />
  ),
  server: (
    <>
      <rect height="7" rx="2" width="17" x="3.5" y="4" />
      <rect height="7" rx="2" width="17" x="3.5" y="13" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M9 10h6M9 13h4" />
    </>
  ),
};

export type KpiIcon = keyof typeof ICON_PATHS;

const iconToneClass: Record<Tone, string> = {
  muted: "border-ds-border-subtle bg-ds-surface-raised text-ds-text-2",
  success: "border-transparent bg-ds-success-soft text-ds-success",
  warning: "border-transparent bg-ds-warning-soft text-ds-warning",
  danger: "border-transparent bg-ds-danger-soft text-ds-danger",
};

export const cardClass =
  "flex min-w-0 flex-col rounded-2xl border border-ds-border-subtle bg-ds-surface p-5 shadow-ds-highlight";

/**
 * One of the six equal-weight Home A cards. A failed card renders the failure
 * note and a retry button instead of a link, so no button sits inside <a>.
 */
export function KpiCard({
  id,
  label,
  icon,
  status,
  value,
  detail,
  tone = "muted",
  href,
  onRetry,
  className,
}: {
  id: string;
  label: string;
  icon: KpiIcon;
  status: "loading" | "error" | "ready";
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  href?: "/dashboard/servers" | "/dashboard/ticket";
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useTranslation("dashboard");
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-ds-text-2 text-xs">{label}</span>
        <span
          aria-busy={status === "loading" || undefined}
          className={cn(
            "font-semibold text-[28px] tabular-nums leading-tight",
            tone === "warning" ? "text-ds-warning" : "text-ds-text-1"
          )}
          data-kpi-value
        >
          {status === "ready" ? value : MISSING}
        </span>
        <span className="min-h-4 truncate text-ds-text-3 text-xs tabular-nums">
          {status === "error"
            ? t("home.fetchFailed", "Failed to load")
            : status === "ready"
              ? detail
              : null}
        </span>
      </div>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[10px] border",
          iconToneClass[tone]
        )}
      >
        <svg
          aria-hidden="true"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          viewBox="0 0 24 24"
        >
          {ICON_PATHS[icon]}
        </svg>
      </span>
    </div>
  );

  const shared = {
    className: cn(
      cardClass,
      tone === "warning" && "border-ds-warning/40",
      className
    ),
    "data-kpi": id,
    "data-tone": tone,
  };

  if (status === "error") {
    return (
      <div {...shared}>
        {body}
        {onRetry ? (
          <Button
            className="mt-2 h-7 self-start px-2 text-xs"
            onClick={onRetry}
            size="sm"
            variant="outline"
          >
            {t("home.retry", "Retry")}
          </Button>
        ) : null}
      </div>
    );
  }
  if (!href) return <div {...shared}>{body}</div>;
  return (
    <Link
      {...shared}
      className={cn(
        shared.className,
        "outline-none transition-colors hover:border-ds-border focus-visible:ring-[3px] focus-visible:ring-ring"
      )}
      to={href}
    >
      {body}
    </Link>
  );
}
