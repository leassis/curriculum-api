import { PostgreSqlContainer } from "@testcontainers/postgresql";

export const POSTGRES_IMAGE = "postgres:18";

export interface StartedContainer {
  getConnectionUri(): string;
  stop(): Promise<unknown>;
}

export interface TestDatabaseDeps {
  startContainer?: (image: string) => Promise<StartedContainer>;
  migrate: (url: string) => Promise<void>;
}

export interface TestDatabase {
  url: string;
  stop(): Promise<void>;
}

const defaultStart = (image: string): Promise<StartedContainer> =>
  new PostgreSqlContainer(image).start();

const scrub = (text: string): string => text.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");

const message = (err: unknown): string => scrub(err instanceof Error ? err.message : String(err));

export async function startTestDatabase(deps: TestDatabaseDeps): Promise<TestDatabase> {
  const start = deps.startContainer ?? defaultStart;

  let container: StartedContainer;
  try {
    container = await start(POSTGRES_IMAGE);
  } catch (err) {
    const reason = message(err);
    if (/container runtime|docker/i.test(reason)) {
      throw new Error(
        `Docker is required for the integration tests and is not reachable: ${reason}`,
      );
    }
    throw new Error(reason);
  }

  const stop = async (): Promise<void> => {
    await container.stop();
  };

  try {
    const url = container.getConnectionUri();
    await deps.migrate(url);
    return { url, stop };
  } catch (err) {
    await stop().catch(() => {});
    throw new Error(message(err));
  }
}
