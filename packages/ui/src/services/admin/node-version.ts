import request from "@workspace/ui/lib/request";

/**
 * 节点版本相关的接口和类型。
 *
 * 【为什么不放在生成的 admin.ts 里】`packages/ui/openapi2ts.config.ts` 是从
 * 上游 perfect-panel/frontend 发布的 swagger 生成类型的，而这些字段和接口
 * 只存在于我们自己的 ppanel-server 分支上。写进生成产物会在下一次
 * `bun run openapi` 时被抹掉，所以单独放在这个手写文件里。
 */

/** 节点上报的版本信息，服务端附在 Server.status 上返回。 */
export type NodeVersionStatus = {
  /** 节点正在运行的版本。旧版本节点不上报，为 undefined。 */
  version?: string;
  /** 上游最新版本，由面板查询。 */
  latest_version?: string;
  /** 是否有可升级版本，由服务端判断（前端不要自己比版本号）。 */
  upgrade_available?: boolean;
};

/**
 * 设置节点的期望版本。节点下次拉配置时会切到这个版本。
 *
 * **可以填比当前更旧的版本**——新版本出问题时用同一条路回退。
 * 传空串表示不再干预这个节点。
 */
export async function setServerTargetVersion(
  body: { id: number; target_version: string },
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
