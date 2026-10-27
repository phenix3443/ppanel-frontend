export type ModuleState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: T };

type QueryLike<T> = {
  data: T | undefined;
  isError: boolean;
  isPending: boolean;
};

/**
 * Collapse a useQuery result into loading | error | ready.
 *
 * An errored query counts as error even when stale data is cached, so health
 * is never derived from data the latest request failed to confirm.
 */
export function toModuleState<T>(query: QueryLike<T>): ModuleState<T> {
  if (query.isError) return { status: "error" };
  if (query.isPending || query.data === undefined) return { status: "loading" };
  return { status: "ready", data: query.data };
}
