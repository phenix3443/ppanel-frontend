import request from "@workspace/ui/lib/request";

/**
 * 节点版本相关的接口和类型。
 *
 * 【为什么不放在生成的 admin.ts 里】`packages/ui/openapi2ts.config.ts` 是从
 * 上游 perfect-panel/frontend 发布的 swagger 生成类型的，而这些字段和接口
 * 只存在于我们自己的 ppanel-server 分支上。写进生成产物会在下一次
 * `bun run openapi` 时被抹掉，所以单独放在这个手写文件里。
 */

/** 「跟随最新」这一档的取值，和服务端 nodeversion.AutoLatest 对应。 */
export const AUTO_LATEST = "latest";

/** 节点上报的版本信息，服务端附在 Server.status 上返回。 */
export type NodeVersionStatus = {
  /** 节点正在运行的版本。旧版本节点不上报，为 undefined。 */
  version?: string;
  /** 上游最新版本，由面板查询。 */
  latest_version?: string;
  /** 是否有可升级版本，由服务端判断（前端不要自己比版本号）。 */
  upgrade_available?: boolean;
};

/** Server 上与版本相关的字段，同样只存在于我们的分支。 */
export type ServerVersionFields = {
  /** 这个节点单独设置的期望版本；空串表示跟随全局默认。 */
  target_version?: string;
  /**
   * 节点设置、全局默认、「跟随最新」收敛之后真正会下发的版本。
   * 由服务端算，前端不要自己再推一遍——界面显示的必须和实际下发的一致。
   */
  effective_target_version?: string;
};

export type NodeVersionOption = {
  version: string;
  prerelease: boolean;
  /**
   * false 表示这个版本没有自升级能力，下发过去节点就再也收不到控制台指令。
   * 由服务端判断（前端不要自己比版本号），界面上要置灰并说明原因，
   * 不能只是不显示——列表里凭空少几项只会让人以为接口坏了。
   */
  self_manageable?: boolean;
  published_at: string;
};

export type NodeVersionCatalog = {
  repo: string;
  latest: string;
  /** 全局默认期望版本：空串=不干预，latest=跟随最新，或一个具体 tag。 */
  default_target_version: string;
  /** 能下发的最低版本；比它旧的下发过去节点会失联。 */
  min_self_manageable?: string;
  list: NodeVersionOption[];
};

/**
 * 设置一批节点的期望版本。节点下次拉配置时会切到这个版本。
 *
 * **可以填比当前更旧的版本**——新版本出问题时用同一条路回退。
 * 传空串表示清掉单独设置、回落到全局默认；传 AUTO_LATEST 表示跟随最新。
 */
export async function setServerTargetVersion(
  body: { ids: number[]; target_version: string },
  options?: { [key: string]: any }
) {
  return request<API.ResponseSuccessBean>(
    `${import.meta.env.VITE_API_PREFIX || ""}/v1/admin/server/target_version`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: body,
      ...(options || {}),
    }
  );
}

/**
 * 拉可下发的版本列表。
 *
 * 列表可能为空（面板还没拉到上游，或 GitHub 不可达）——此时界面要退化成
 * 让管理员手输版本号，而不是把升级入口禁掉：GitHub 出问题时恰恰最需要降级。
 */
export async function listNodeVersions(options?: { [key: string]: any }) {
  return request<API.ResponseSuccessBean & { data?: NodeVersionCatalog }>(
    `${import.meta.env.VITE_API_PREFIX || ""}/v1/admin/server/node/versions`,
    { method: "GET", ...(options || {}) }
  );
}
