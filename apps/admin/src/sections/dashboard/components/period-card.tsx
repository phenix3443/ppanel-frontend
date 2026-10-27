import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { cardClass } from "./kpi-card";
import { segmentListClass, segmentTriggerClass } from "./segment";
import type { Period } from "./stats-chart";

export function usePeriodOptions(): [Period, string][] {
  const { t } = useTranslation("dashboard");
  return [
    ["today", t("today", "Today")],
    ["month", t("month", "Month")],
    ["total", t("total", "Total")],
  ];
}

/** Card shell with a title and one segmented tab group in the header. */
export function PeriodCard<V extends string>({
  module,
  title,
  options,
  value,
  onChange,
  children,
}: {
  module: string;
  title: string;
  options: [value: V, label: string][];
  value: V;
  onChange: (value: V) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("dashboard");
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(cardClass, "gap-4")}
      data-module={module}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-[15px] text-ds-text-1" id={titleId}>
          {title}
        </h2>
        <Tabs onValueChange={(v) => onChange(v as V)} value={value}>
          <TabsList
            aria-label={t("home.cardRange", "{{title}} range", { title })}
            className={segmentListClass}
          >
            {options.map(([v, label]) => (
              <TabsTrigger className={segmentTriggerClass} key={v} value={v}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {children}
    </section>
  );
}
