import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslation } from "react-i18next";

export function ModuleLoading({
  className,
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      aria-busy="true"
      className={cn("flex flex-col justify-center gap-3", className)}
      role="status"
    >
      <span className="sr-only">{t("home.loading", "Loading")}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton className="h-4 w-full bg-ds-surface-raised" key={i} />
      ))}
    </div>
  );
}

export function ModuleError({
  className,
  onRetry,
}: {
  className?: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[10px] border border-ds-border-subtle border-dashed p-5 text-center",
        className
      )}
      data-module-state="error"
    >
      <p className="text-ds-text-2 text-sm">
        {t("home.loadFailed", "Failed to load data")}
      </p>
      <Button onClick={onRetry} size="sm" variant="outline">
        {t("home.retry", "Retry")}
      </Button>
    </div>
  );
}

export function ModuleEmpty({ className }: { className?: string }) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-[10px] border border-ds-border border-dashed p-5 text-center",
        className
      )}
      data-module-state="empty"
    >
      <p className="font-semibold text-ds-text-2 text-sm">
        {t("home.empty", "No data yet")}
      </p>
      <p className="text-ds-text-3 text-xs">
        {t("home.emptyHint", "It will appear here once there is data")}
      </p>
    </div>
  );
}

/** Placeholder for a number that is still loading or failed to load. */
export const MISSING = "—";
