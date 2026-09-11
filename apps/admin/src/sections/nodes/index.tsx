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
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type NodeVersionStatus,
  setServerTargetVersion,
} from "@workspace/ui/services/admin/node-version";
import { useNode } from "@/stores/node";
import { useServer } from "@/stores/server";
import NodeForm from "./node-form";

export default function Nodes() {
  const { t } = useTranslation("nodes");
  const ref = useRef<ProTableActions>(null);
  const [loading, setLoading] = useState(false);

  // Use our zustand store for server data
  const { getServerName, getServerAddress, getProtocolPort, getServerById } =
    useServer();

  // 版本字段只存在于我们自己的 ppanel-server 分支上；生成的 API.ServerStatus
  // 来自上游 swagger，没有这几项，所以在读取处收口成一个明确的类型。
  const versionOf = (serverId?: number): NodeVersionStatus =>
    (getServerById?.(serverId as number)?.status ?? {}) as NodeVersionStatus;

  const applyTargetVersion = async (serverId: number, version: string) => {
    setLoading(true);
    try {
      await setServerTargetVersion({ id: serverId, target_version: version });
      toast.success(
        t("versionApplied", "已下发，节点会在下次拉取配置时切换（最多 60 秒）")
      );
      ref.current?.refresh();
    } catch (_e) {
      toast.error(t("versionFailed", "下发失败"));
    } finally {
      setLoading(false);
    }
  };
  const { fetchNodes, fetchTags } = useNode();

  return (
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
                  v ? t("enabled_on", "Enabled") : t("enabled_off", "Disabled")
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
          cell: ({ row }) => {
            const v = versionOf(row.original.server_id);
            if (!v.version) {
              // 旧版本节点不上报版本；这里不能显示成「最新」，那会掩盖真实情况。
              return <span className="text-muted-foreground">{t("versionUnknown", "未上报")}</span>;
            }
            return (
              <div className="flex items-center gap-2">
                <span>{v.version}</span>
                {v.upgrade_available && (
                  <Badge variant="destructive">
                    {v.latest_version
                      ? t("upgradeTo", "可升级 → {{v}}", { v: v.latest_version })
                      : t("upgradable", "可升级")}
                  </Badge>
                )}
              </div>
            );
          },
        },
        {
          id: "version_action",
          header: t("versionAction", "版本操作"),
          cell: ({ row }) => {
            const v = versionOf(row.original.server_id);
            const serverId = row.original.server_id;
            return (
              <div className="flex items-center gap-2">
                {v.upgrade_available && v.latest_version && (
                  <ConfirmButton
                    cancelText={t("cancel", "Cancel")}
                    confirmText={t("confirm", "Confirm")}
                    description={t(
                      "upgradeDesc",
                      "节点会下载并替换自身二进制后重启，期间连接会短暂中断。"
                    )}
                    onConfirm={() =>
                      applyTargetVersion(serverId, v.latest_version as string)
                    }
                    title={t("upgradeTitle", "升级到 {{v}}", {
                      v: v.latest_version,
                    })}
                    trigger={
                      <Button disabled={loading} size="sm">
                        {t("upgrade", "升级")}
                      </Button>
                    }
                  />
                )}
                <Button
                  disabled={loading}
                  onClick={() => {
                    // 手动指定版本，**可以填更旧的以回退**。
                    const input = window.prompt(
                      t(
                        "setVersionPrompt",
                        "输入目标版本（如 v1.1.14，可填更旧的版本以回退；留空表示不干预）"
                      ),
                      v.version ?? ""
                    );
                    if (input !== null) {
                      applyTargetVersion(serverId, input.trim());
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  {t("setVersion", "指定版本")}
                </Button>
              </div>
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
  );
}
