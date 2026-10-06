/**
 * Minimal chainable Supabase mock for unit tests. Configure canned
 * results per table + operation type (select/insert/update); every
 * intermediate call (.eq(), .order(), .limit(), …) just returns the
 * same chain so real server-action code can call through it unchanged.
 */
export interface MockResult {
  data: unknown;
  error: unknown;
}

export type MockTableConfig = Partial<
  Record<"select" | "insert" | "update" | "upsert" | "delete", MockResult>
>;

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "in",
  "order",
  "limit",
  "or",
  "overlaps",
  "ilike",
] as const;

export function createSupabaseMock(config: Record<string, MockTableConfig>) {
  return function createAdminClient() {
    return {
      from(table: string) {
        const tableConfig = config[table] ?? {};
        // Mutating verbs (insert/update/upsert/delete) determine the
        // operation, even though PostgREST chains a trailing `.select()`
        // after them to specify which columns to return — that trailing
        // call must NOT override the mode back to a plain read.
        let mode: keyof MockTableConfig | null = null;
        const chain: Record<string, (...args: unknown[]) => unknown> = {};

        for (const method of CHAIN_METHODS) {
          chain[method] = (..._args: unknown[]) => {
            if (method === "insert" || method === "update" || method === "upsert" || method === "delete") {
              mode = method;
            } else if (method === "select" && mode === null) {
              mode = "select";
            }
            return chain;
          };
        }

        const resolveResult = (): MockResult => tableConfig[mode ?? "select"] ?? { data: null, error: null };

        chain.maybeSingle = () => Promise.resolve(resolveResult());
        chain.single = () => Promise.resolve(resolveResult());
        // Awaiting the chain directly (no .single()/.maybeSingle()) — used
        // for plain `select().eq()...` queries that resolve to a list.
        // Different signature than the rest of the chain, so it's typed
        // separately rather than forced into the shared method map above.
        (chain as unknown as { then: (resolve: (v: MockResult) => void) => void }).then = (resolve) => {
          resolve(resolveResult());
        };

        return chain;
      },
    };
  };
}
