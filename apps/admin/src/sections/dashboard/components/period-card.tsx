import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { segmentListClass, segmentTriggerClass } from "./segment";

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
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-ds-border-subtle bg-ds-surface p-5 shadow-ds-highlight"
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
