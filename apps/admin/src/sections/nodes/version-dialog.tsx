"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  AUTO_LATEST,
  type NodeVersionCatalog,
} from "@workspace/ui/services/admin/node-version";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/** 三档语义和服务端存的值一一对应，见 nodeversion.ValidateTarget。 */
type Mode = "latest" | "pinned" | "inherit";

function modeOf(target: string | undefined): Mode {
  if (target === AUTO_LATEST) return "latest";
  if (target) return "pinned";
  return "inherit";
}

export type VersionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 要设置的节点数，只用于文案；实际 id 由调用方持有。 */
  count: number;
  /** 单个节点时它当前的设置，用来回填；批量时传 undefined。 */
  current?: string;
  catalog?: NodeVersionCatalog;
  loading?: boolean;
  onSubmit: (targetVersion: string) => void;
};

/**
 * 设置期望版本的对话框，单节点和批量共用。
 *
 * 【为什么不用 window.prompt】原来是 prompt 要管理员手打版本号：既不知道有
 * 哪些 tag 可选，打错了也要等节点拉配置失败才发现。Elastic Fleet / Cribl Edge
 * 都是给下拉，同时保留手输以支持列表里没有的版本（降级到很老的 tag）。
 */
export default function VersionDialog({
  open,
  onOpenChange,
  count,
  current,
  catalog,
  loading,
  onSubmit,
}: VersionDialogProps) {
  const { t } = useTranslation("nodes");
  const [mode, setMode] = useState<Mode>(modeOf(current));
  const [pinned, setPinned] = useState(
    current && current !== AUTO_LATEST ? current : ""
  );
  const [manual, setManual] = useState(false);

  // 每次打开都按当前值重置，否则上一次操作的选择会残留到下一个节点上。
  useEffect(() => {
    if (!open) return;
    setMode(modeOf(current));
    setPinned(current && current !== AUTO_LATEST ? current : "");
    setManual(false);
  }, [open, current]);

  const versions = catalog?.list ?? [];
  // 列表为空时只能手输：面板还没拉到上游，或 GitHub 不可达。
  const forceManual = manual || versions.length === 0;
  const canSubmit =
    mode !== "pinned" || /^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(pinned);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("versionDialogTitle", "设置期望版本（{{count}} 个节点）", {
              count,
            })}
          </DialogTitle>
          <DialogDescription>
            {t(
              "versionDialogDesc",
              "节点下次拉配置时会下载并替换自身二进制后重启，期间连接会短暂中断。可以选比当前更旧的版本以回退。"
            )}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          className="gap-3"
          onValueChange={(v) => setMode(v as Mode)}
          value={mode}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="mode-latest" value="latest" />
            <Label htmlFor="mode-latest">
              {catalog?.latest
                ? t("modeLatestWith", "跟随最新（当前 {{v}}）", {
                    v: catalog.latest,
                  })
                : t("modeLatest", "跟随最新")}
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroupItem id="mode-pinned" value="pinned" />
            <Label htmlFor="mode-pinned">{t("modePinned", "指定版本")}</Label>
          </div>
          {mode === "pinned" && (
            <div className="ml-6 flex flex-col gap-2">
              {forceManual ? (
                <Input
                  onChange={(e) => setPinned(e.target.value.trim())}
                  placeholder="v1.1.14"
                  value={pinned}
                />
              ) : (
                <Select onValueChange={setPinned} value={pinned}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("pickVersion", "选择一个版本")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.version} value={v.version}>
                        {v.version}
                        {v.prerelease ? ` · ${t("prerelease", "预发布")}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {versions.length > 0 && (
                <button
                  className="self-start text-muted-foreground text-xs underline"
                  onClick={() => setManual((v) => !v)}
                  type="button"
                >
                  {manual
                    ? t("pickFromList", "从列表选择")
                    : t("typeManually", "列表里没有？手动输入")}
                </button>
              )}
              {versions.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  {t(
                    "versionListEmpty",
                    "没能从 {{repo}} 拉到版本列表，请手动输入 tag。",
                    { repo: catalog?.repo ?? "GitHub" }
                  )}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <RadioGroupItem id="mode-inherit" value="inherit" />
            <Label htmlFor="mode-inherit">
              {t("modeInherit", "跟随全局默认")}
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            disabled={loading || !canSubmit}
            onClick={() =>
              onSubmit(
                mode === "latest"
                  ? AUTO_LATEST
                  : mode === "pinned"
                    ? pinned
                    : ""
              )
            }
            type="button"
          >
            {t("apply", "下发")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
