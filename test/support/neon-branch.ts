// Creates a throwaway Neon branch for an integration run. Ported from curriculum-ai's
// scripts/gate-branch.ts. Logs and errors carry branch ids only, never the API key or a URI.
const API = "https://console.neon.tech/api/v2";
const BRANCH_TTL_MS = 60 * 60 * 1000; // Neon deletes the branch even if our delete fails
const POLL_TRIES = 60;
const POLL_INTERVAL_MS = 1000;

export interface TestBranchDeps {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  migrate: (url: string) => Promise<void>;
  log: (line: string) => void;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface TestBranch {
  url: string;
  branchId: string;
  stop(): Promise<void>;
}

interface Operation {
  id: string;
  status: string;
}

interface CreateBranchResponse {
  branch: { id: string };
  operations?: Operation[];
  connection_uris?: { connection_uri: string }[];
}

export async function startTestBranch(deps: TestBranchDeps): Promise<TestBranch> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const required = (name: string, value: string | undefined): string => {
    if (!value) throw new Error(`${name} is not set`);
    return value;
  };
  const apiKey = required("NEON_API_KEY", deps.env.NEON_API_KEY);
  const projectId = required("NEON_PROJECT_ID", deps.env.NEON_PROJECT_ID);
  const parentId =
    deps.env.TEST_PARENT_BRANCH_ID || required("PARENT_BRANCH_ID", deps.env.PARENT_BRANCH_ID);

  async function neon<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await deps.fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res
        .json()
        .then((e: { message?: unknown }) => (typeof e.message === "string" ? `: ${e.message}` : ""))
        .catch(() => "");
      throw new Error(`Neon API ${method} ${path} returned ${res.status}${detail}`);
    }
    return (await res.json()) as T;
  }

  async function waitForOperations(operations: Operation[]): Promise<void> {
    for (const op of operations) {
      for (let attempt = 1; ; attempt += 1) {
        const { operation } = await neon<{ operation: Operation }>(
          "GET",
          `/projects/${projectId}/operations/${op.id}`,
        );
        if (operation.status === "finished") break;
        if (operation.status === "failed" || operation.status === "cancelled") {
          throw new Error(`Neon operation ${op.id} ${operation.status}`);
        }
        if (attempt >= POLL_TRIES) throw new Error(`Neon operation ${op.id} did not finish in 60s`);
        await sleep(POLL_INTERVAL_MS);
      }
    }
  }

  const deleteBranch = (branchId: string) =>
    neon("DELETE", `/projects/${projectId}/branches/${branchId}`);

  const startedAt = now();
  const expiresAt = new Date(startedAt.getTime() + BRANCH_TTL_MS)
    .toISOString()
    .replace(/\.\d+Z$/, "Z");
  const created = await neon<CreateBranchResponse>("POST", `/projects/${projectId}/branches`, {
    branch: { name: `test-${startedAt.getTime()}`, parent_id: parentId, expires_at: expiresAt },
    endpoints: [{ type: "read_write" }],
  });
  const branchId = created.branch.id;

  const stop = async (): Promise<void> => {
    try {
      await deleteBranch(branchId);
    } catch {
      deps.log(`could not delete test branch ${branchId}`);
    }
  };

  try {
    const url = created.connection_uris?.[0]?.connection_uri;
    if (!url) throw new Error("Neon returned no connection URI for the new branch");
    await waitForOperations(created.operations ?? []);
    await deps.migrate(url);
    return { url, branchId, stop };
  } catch (err) {
    await stop();
    throw err;
  }
}
