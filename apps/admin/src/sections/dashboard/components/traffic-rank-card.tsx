import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { formatBytes } from "@workspace/ui/utils/formatting";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserDetail, UserSubscribeDetail } from "@/sections/user/user-detail";
import { useServerTotal } from "../hooks/use-dashboard-data";
import { toModuleState } from "../lib/module-state";
import { ModuleEmpty, ModuleError, ModuleLoading } from "./module-states";
import { PeriodCard } from "./period-card";

type Day = "today" | "yesterday";
export type Target = "nodes" | "users";

export type RankRow = {
  key: string;
  name: string;
  traffic: number;
  uid?: number;
  sid?: number;
};

export function rankRows(
  data: API.ServerTotalDataResponse,
  target: Target,
  day: Day
): RankRow[] {
  if (target === "nodes") {
    const list =
      day === "today"
        ? data.server_traffic_ranking_today
        : data.server_traffic_ranking_yesterday;
    return (list ?? []).map((item, i) => ({
      key: `${item.server_id}-${i}`,
      name: item.name,
      traffic: item.upload + item.download,
    }));
  }
  const list =
    day === "today"
      ? data.user_traffic_ranking_today
      : data.user_traffic_ranking_yesterday;
  return (list ?? []).map((item, i) => ({
    key: `${item.sid}-${i}`,
    name: String(item.sid),
    sid: item.sid,
    uid: item.uid,
    traffic: item.upload + item.download,
  }));
}

/** Bar width relative to the first row; 0 when the leader has no traffic. */
export function barPercent(traffic: number, top: number) {
  if (!(top > 0)) return 0;
  return Math.max(0, Math.min(100, (traffic / top) * 100));
}

function UserRowDetail({ row }: { row: RankRow }) {
  const { t } = useTranslation("dashboard");
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("home.userDetail", "Subscription {{id}} details", {
          id: row.name,
        })}
        className="min-w-0 truncate rounded-[6px] text-left font-ds-mono text-ds-text-1 underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        title={row.name}
      >
        {row.name}
      </PopoverTrigger>
      <PopoverContent align="start" className="admin-home w-80">
        {row.uid ? (
          <>
            <UserDetail id={row.uid} />
            <Separator className="my-2" />
          </>
        ) : null}
        <UserSubscribeDetail enabled={true} id={row.sid ?? 0} />
      </PopoverContent>
    </Popover>
  );
}

function RankList({ rows, target }: { rows: RankRow[]; target: Target }) {
  const top = rows[0]?.traffic ?? 0;
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((row, index) => (
        <li
          className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[6px] px-1 py-1.5 hover:bg-ds-surface-raised"
          key={row.key}
        >
          <span
            className={cn(
              "text-right font-semibold text-xs tabular-nums",
              index < 3 ? "text-ds-signal" : "text-ds-text-3"
            )}
          >
            {index + 1}
          </span>
          {target === "users" ? (
            <UserRowDetail row={row} />
          ) : (
            <span
              className="min-w-0 truncate text-ds-text-1 text-sm"
              title={row.name}
            >
              {row.name}
            </span>
          )}
          <span
            className="shrink-0 font-ds-mono text-ds-text-2 text-xs tabular-nums"
            data-rank-value
          >
            {formatBytes(row.traffic)}
          </span>
          <span
            aria-hidden="true"
            className="col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-ds-surface-raised"
          >
            <span
              className="block h-full rounded-full bg-ds-signal/70"
              style={{ width: `${barPercent(row.traffic, top)}%` }}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function TrafficRankCard({ target }: { target: Target }) {
  const { t } = useTranslation("dashboard");
  const [day, setDay] = useState<Day>("today");
  const query = useServerTotal();
  const server = toModuleState(query);

  let body: React.ReactNode;
  if (server.status === "loading") {
    body = <ModuleLoading className="h-72" rows={6} />;
  } else if (server.status === "error") {
    body = <ModuleError className="h-72" onRetry={() => query.refetch()} />;
  } else {
    const rows = rankRows(server.data, target, day);
    body =
      rows.length === 0 ? (
        <ModuleEmpty className="h-72" />
      ) : (
        <RankList rows={rows} target={target} />
      );
  }

  return (
    <PeriodCard
      module={`traffic-rank-${target}`}
      onChange={setDay}
      options={[
        ["today", t("today", "Today")],
        ["yesterday", t("yesterday", "Yesterday")],
      ]}
      title={
        target === "nodes"
          ? t("nodeTraffic", "Node Traffic")
          : t("userTraffic", "User Traffic")
      }
      value={day}
    >
      {body}
    </PeriodCard>
  );
}
