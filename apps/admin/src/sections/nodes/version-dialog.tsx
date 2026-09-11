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

/**
 * 三档语义和服务端存的值一一对应，见 nodeversion.Resolve。
 *
 * 【没有第四档，也没有继承】原来还有一档「跟随全局默认」，配合一个全局设置
 * 使用——等于同一个三档菜单在两个页面各出现一次，要回答「这个节点会跑哪个
 * 版本」得做两层解析。全局那层已经砍掉了。
 */
type Mode = "latest" | "pinned" | "frozen";

function modeOf(target: string | undefined): Mode {
  if (target === AUTO_LATEST) return "latest";
  if (target) return "pinned";
  return "frozen";
}

export type VersionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 要设置的节点数，只用于文案；实际 id 由调用方持有。 */
  count: number;
  /** 单个节点时它当前的策略，用来回填；批量时传 undefined。 */
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
  const minVersion = catalog?.min_self_manageable;
  // 手输的版本也要拦：服务端会拒，但等提交才报错不如当场说清楚。
  // 只在两边都解析得出来时比较，解析不出来交给服务端判断。
  const belowFloor = (() => {
    if (!(minVersion && pinned)) return false;
    const parse = (v: string) =>
      /^v?(\d+)\.(\d+)\.(\d+)/.exec(v)?.slice(1, 4).map(Number);
    const a = parse(pinned);
    const b = parse(minVersion);
    if (!(a && b)) return false;
    for (let i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return (a[i] as number) < (b[i] as number);
    }
    return false;
  })();
  const canSubmit =
    mode !== "pinned" ||
    (/^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(pinned) && !belowFloor);

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
              "每个节点的版本由它自己这一项决定，没有全局默认。切换时节点会下载并替换自身二进制后重启，期间连接会短暂中断；可以选比当前更旧的版本以回退。"
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
                    {versions.map((v) => {
                      // 【不能只是不显示】没有自升级能力的版本下发过去节点就
                      // 失联了，但列表里凭空少几项会让人以为接口坏了。置灰
                      // 并把原因写在旁边。
                      const blocked = v.self_manageable === false;
                      return (
                        <SelectItem
                          disabled={blocked}
                          key={v.version}
                          value={v.version}
                        >
                          {v.version}
                          {v.prerelease
                            ? ` · ${t("prerelease", "预发布")}`
                            : ""}
                          {blocked
                            ? ` · ${t("notSelfManageable", "无自升级能力，降过去就收不回")}`
                            : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {belowFloor && (
                <p className="text-destructive text-xs">
                  {t(
                    "belowFloor",
                    "{{v}} 没有自升级能力，下发过去节点就再也收不到控制台指令，只能人登机器手动装。能下发的最低版本是 {{min}}。",
                    { v: pinned, min: minVersion }
                  )}
                </p>
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
            <RadioGroupItem id="mode-frozen" value="frozen" />
            <Label htmlFor="mode-frozen">
              {t("modeFrozen", "不自动升级（保持现状）")}
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
