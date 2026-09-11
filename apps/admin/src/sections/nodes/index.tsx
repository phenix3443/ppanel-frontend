"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { ConfirmButton } from "@workspace/ui/composed/confirm-button";
import {
  ProTable,
  type ProTableActions,
} from "@workspace/ui/composed/pro-table/pro-table";
import {
  postServerNodeCreate as createNode,
  postServerNodeOpenApiDelete as deleteNode,
  getServerNodeList as filterNodeList,
  postServerNodeSort as resetSortWithNode,
  postServerNodeStatusToggle as toggleNodeStatus,
  postServerNodeUpdate as updateNode,
} from "@workspace/ui/services/admin/admin";
import {
  AUTO_LATEST,
  listNodeVersions,
  type NodeVersionCatalog,
  type NodeVersionStatus,
  type ServerVersionFields,
  setServerTargetVersion,
} from "@workspace/ui/services/admin/node-version";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNode } from "@/stores/node";
import { useServer } from "@/stores/server";
import NodeForm from "./node-form";
import VersionDialog from "./version-dialog";

export default function Nodes() {
  const { t } = useTranslation("nodes");
  const ref = useRef<ProTableActions>(null);
  const [loading, setLoading] = useState(false);

  // Use our zustand store for server data
  const {
    getServerName,
    getServerAddress,
    getProtocolPort,
    getServerById,
    fetchServers,
    servers,
  } = useServer();

  // 版本字段只存在于我们自己的 ppanel-server 分支上；生成的 API.ServerStatus
  // 来自上游 swagger，没有这几项，所以在读取处收口成一个明确的类型。
  const versionOf = (serverId?: number): NodeVersionStatus =>
    (getServerById?.(serverId as number)?.status ?? {}) as NodeVersionStatus;
  const targetOf = (serverId?: number): ServerVersionFields =>
    (getServerById?.(serverId as number) ?? {}) as ServerVersionFields;

  const [catalog, setCatalog] = useState<NodeVersionCatalog>();
  useEffect(() => {
    // 拉不到不报错：列表为空时对话框会退化成手输，见 version-dialog。
    listNodeVersions()
      .then((r) => setCatalog((r as any)?.data?.data ?? (r as any)?.data))
      .catch(() => setCatalog(undefined));
  }, []);

  // 打开对话框时记住要改哪些 server，以及（单个时）它当前的设置用于回填。
  const [dialog, setDialog] = useState<{
    ids: number[];
    current?: string;
  }>();

  const applyTargetVersion = async (serverIds: number[], version: string) => {
    setLoading(true);
    try {
      await setServerTargetVersion({ ids: serverIds, target_version: version });
      toast.success(
        t("versionApplied", "已下发，节点会在下次拉取配置时切换（最多 60 秒）")
      );
      // 版本信息挂在 server store 上，而这个 store 只在首次挂载时拉一次。
      // 不刷新它的话，节点升级完成后页面会一直显示旧版本，直到整页重载。
      await fetchServers();
      ref.current?.refresh();
      setDialog(undefined);
    } catch (_e) {
      toast.error(t("versionFailed", "下发失败"));
    } finally {
      setLoading(false);
    }
  };

  // 【按 server 去重】一个 server 可以有多条协议记录，表格一行是一条协议。
  // 不去重的话勾中同一台机器的两行会重复下发。
  const serverIdsOf = (rows: API.Node[]) =>
    Array.from(
      new Set(rows.map((r) => r.server_id).filter(Boolean))
    ) as number[];

  // 【统计的是全部节点，不只是当前页】节点列表是后端分页的，只看本页会让
  // 「还有几台没升」这个数字随翻页变化，起不到提示作用。
  const outdatedServerIds = useMemo(
    () =>
      servers
        .filter(
          (s) => (s.status as NodeVersionStatus | undefined)?.upgrade_available
        )
        .map((s) => s.id)
        .filter(Boolean) as number[],
    [servers]
  );
  const { fetchNodes, fetchTags } = useNode();

  return (
    <>
      <ProTable<API.Node, { search: string }>
        action={ref}
        actions={{
          render: (row) => [
            <NodeForm
              initialValues={row}
              key="edit"
              loading={loading}
              onSubmit={async (values) => {
                setLoading(true);
                try {
                  const body: API.UpdateNodeRequest = {
                    ...row,
                    ...values,
                  } as any;
                  await updateNode(body);
                  toast.success(t("updated", "Updated"));
                  ref.current?.refresh();
                  fetchNodes();
                  fetchTags();
                  setLoading(false);
                  return true;
                } catch {
                  setLoading(false);
                  return false;
                }
              }}
              title={t("drawerEditTitle", "Edit Node")}
              trigger={t("edit", "Edit")}
            />,
            <ConfirmButton
              cancelText={t("cancel", "Cancel")}
              confirmText={t("confirm", "Confirm")}
              description={t(
                "confirmDeleteDesc",
                "This action cannot be undone."
              )}
              key="delete"
              onConfirm={async () => {
                await deleteNode({ id: row.id } as any);
                toast.success(t("deleted", "Deleted"));
                ref.current?.refresh();
                fetchNodes();
                fetchTags();
              }}
              title={t("confirmDeleteTitle", "Delete this node?")}
              trigger={
                <Button variant="destructive">{t("delete", "Delete")}</Button>
              }
            />,
            <Button
              key="copy"
              onClick={async () => {
                const {
                  id: _id,
                  sort: _sort,
                  enabled: _enabled,
                  updated_at: _updated_at,
                  created_at: _created_at,
                  ...rest
                } = row as any;
                await createNode({
                  ...rest,
                  enabled: false,
                });
                toast.success(t("copied", "Copied"));
                ref.current?.refresh();
                fetchNodes();
                fetchTags();
              }}
              variant="outline"
            >
              {t("copy", "Copy")}
            </Button>,
          ],
          batchRender(rows) {
            return [
              <Button
                disabled={loading}
                key="version"
                onClick={() => setDialog({ ids: serverIdsOf(rows) })}
                variant="outline"
              >
                {t("setVersion", "设置版本")}
              </Button>,
              <ConfirmButton
                cancelText={t("cancel", "Cancel")}
                confirmText={t("confirm", "Confirm")}
                description={t(
                  "confirmDeleteDesc",
                  "This action cannot be undone."
                )}
                key="delete"
                onConfirm={async () => {
                  await Promise.all(
                    rows.map((r) => deleteNode({ id: r.id } as any))
                  );
                  toast.success(t("deleted", "Deleted"));
                  ref.current?.refresh();
                  fetchNodes();
                  fetchTags();
                }}
                title={t("confirmDeleteTitle", "Delete this node?")}
                trigger={
                  <Button variant="destructive">{t("delete", "Delete")}</Button>
                }
              />,
            ];
          },
        }}
        columns={[
          {
            id: "enabled",
            header: t("enabled", "Enabled"),
            cell: ({ row }) => (
              <Switch
                checked={row.original.enabled}
                onCheckedChange={async (v) => {
                  await toggleNodeStatus({ id: row.original.id, enable: v });
                  toast.success(
                    v
                      ? t("enabled_on", "Enabled")
                      : t("enabled_off", "Disabled")
                  );
                  ref.current?.refresh();
                  fetchNodes();
                  fetchTags();
                }}
              />
            ),
          },
          { accessorKey: "name", header: t("name", "Name") },

          {
            id: "address_port",
            header: `${t("address", "Address")}:${t("port", "Port")}`,
            cell: ({ row }) =>
              `${row.original.address || "—"}:${row.original.port || "—"}`,
          },

          {
            id: "server_id",
            header: t("server", "Server"),
            cell: ({ row }) =>
              `${getServerName(row.original.server_id)}:${getServerAddress(row.original.server_id)}`,
          },
          {
            id: "protocol",
            header: ` ${t("protocol", "Protocol")}:${t("port", "Port")}`,
            cell: ({ row }) =>
              `${row.original.protocol}:${getProtocolPort(row.original.server_id, row.original.protocol)}`,
          },
          {
            id: "version",
            header: t("version", "Version"),
            // 【整格可点，不另起一列按钮】原来右边还有一列「版本操作」，一行一个
            // 按钮、点开还要手打版本号。Cribl Edge 的做法是点版本号本身就是编辑
            // 入口，省一列宽度，也省一次「这列是干嘛的」的猜测。
            cell: ({ row }) => {
              const serverId = row.original.server_id;
              const v = versionOf(serverId);
              const target = targetOf(serverId);
              const effective = target.effective_target_version;
              const pending = Boolean(
                effective && v.version && effective !== v.version
              );
              return (
                <button
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted"
                  disabled={!serverId}
                  onClick={() =>
                    setDialog({
                      ids: [serverId as number],
                      current: target.target_version,
                    })
                  }
                  type="button"
                >
                  {v.version ? (
                    <span>{v.version}</span>
                  ) : (
                    // 旧版本节点不上报版本；这里不能显示成「最新」，那会掩盖真实情况。
                    <span className="text-muted-foreground">
                      {t("versionUnknown", "未上报")}
                    </span>
                  )}
                  {pending && (
                    <Badge variant="secondary">
                      {t("switchingTo", "切换中 → {{v}}", { v: effective })}
                    </Badge>
                  )}
                  {!pending && v.upgrade_available && (
                    <Badge variant="destructive">
                      {v.latest_version
                        ? t("upgradeTo", "可升级 → {{v}}", {
                            v: v.latest_version,
                          })
                        : t("upgradable", "可升级")}
                    </Badge>
                  )}
                  {!(pending || v.upgrade_available) && v.version && (
                    <Badge variant="outline">{t("upToDate", "最新")}</Badge>
                  )}
                  {target.target_version &&
                    target.target_version !== AUTO_LATEST && (
                      <Badge variant="outline">
                        {t("pinnedAt", "已固定 {{v}}", {
                          v: target.target_version,
                        })}
                      </Badge>
                    )}
                </button>
              );
            },
          },
          {
            accessorKey: "tags",
            header: t("tags", "Tags"),
            cell: ({ row }) => (
              <div className="flex flex-wrap gap-1">
                {(row.original.tags || []).length === 0
                  ? "—"
                  : row.original.tags.map((tg) => (
                      <Badge key={tg} variant="outline">
                        {tg}
                      </Badge>
                    ))}
              </div>
            ),
          },
        ]}
        header={{
          title: t("pageTitle", "Nodes"),
          toolbar: (
            <>
              {outdatedServerIds.length > 0 && (
                <Button
                  disabled={loading}
                  onClick={() =>
                    setDialog({ ids: outdatedServerIds, current: AUTO_LATEST })
                  }
                  variant="outline"
                >
                  {t("outdatedCount", "{{n}} 个节点可升级", {
                    n: outdatedServerIds.length,
                  })}
                </Button>
              )}
              <NodeForm
                loading={loading}
                onSubmit={async (values) => {
                  setLoading(true);
                  try {
                    const body: API.CreateNodeRequest = {
                      name: values.name,
                      server_id: Number(values.server_id!),
                      protocol: values.protocol,
                      address: values.address,
                      port: Number(values.port!),
                      tags: values.tags || [],
                      enabled: false,
                    };
                    await createNode(body);
                    toast.success(t("created", "Created"));
                    ref.current?.refresh();
                    fetchNodes();
                    fetchTags();
                    setLoading(false);
                    return true;
                  } catch {
                    setLoading(false);
                    return false;
                  }
                }}
                title={t("drawerCreateTitle", "Create Node")}
                trigger={t("create", "Create")}
              />
            </>
          ),
        }}
        onSort={async (source, target, items) => {
          // NOTE: `items` is the current page's items from ProTable.
          // Avoid mutating it in-place, and persist sort changes reliably.
          const sourceIndex = items.findIndex(
            (item) => String(item.id) === source
          );
          const targetIndex = items.findIndex(
            (item) => String(item.id) === target
          );

          if (sourceIndex === -1 || targetIndex === -1) return items;

          const prevSortById = new Map(items.map((it) => [it.id, it.sort]));

          const next = items.slice();
          const [movedItem] = next.splice(sourceIndex, 1);
          next.splice(targetIndex, 0, movedItem!);

          // IMPORTANT:
          // Some installations have duplicate / empty `sort` values (commonly 0 or null)
          // which makes the order appear "random" after refresh and also makes
          // "swap sort values" strategies a no-op.
          //
          // To make the ordering stable, we re-index the current page to a strictly
          // increasing sequence.
          const numericSorts = items
            .map((it) => (typeof it.sort === "number" ? it.sort : Number.NaN))
            .filter((v) => Number.isFinite(v)) as number[];
          const baseSort = numericSorts.length ? Math.min(...numericSorts) : 0;

          const updatedItems = next.map((item, index) => ({
            ...item,
            sort: baseSort + index,
          }));

          const changedItems = updatedItems.filter(
            (item) => item.sort !== prevSortById.get(item.id)
          );

          if (changedItems.length > 0) {
            await resetSortWithNode({
              // Send all changed rows (within the current page) so backend can persist.
              sort: changedItems.map((item) => ({
                id: item.id,
                sort: item.sort,
              })) as API.SortItem[],
            });
            toast.success(t("sorted_success", "Sorted successfully"));
          }

          return updatedItems;
        }}
        params={[{ key: "search" }]}
        request={async (pagination, filter) => {
          const { data } = await filterNodeList({
            page: pagination.page,
            size: pagination.size,
            search: filter?.search || undefined,
          });
          const rawList = (data?.data?.list || []) as API.Node[];
          // Backend should ideally return nodes already sorted, but we also sort on the
          // frontend to keep the UI stable (and avoid "random" order after refresh).
          const list = rawList.slice().sort((a, b) => {
            const as = a.sort;
            const bs = b.sort;
            const an = typeof as === "number" ? as : Number.POSITIVE_INFINITY;
            const bn = typeof bs === "number" ? bs : Number.POSITIVE_INFINITY;
            if (an !== bn) return an - bn;
            // Tie-breaker to keep a stable order.
            return Number(a.id) - Number(b.id);
          });
          const total = Number(data?.data?.total || list.length);
          return { list, total };
        }}
      />
      <VersionDialog
        catalog={catalog}
        count={dialog?.ids.length ?? 0}
        current={dialog?.current}
        loading={loading}
        onOpenChange={(o) => !o && setDialog(undefined)}
        onSubmit={(v) => applyTargetVersion(dialog?.ids ?? [], v)}
        open={Boolean(dialog)}
      />
    </>
  );
}
