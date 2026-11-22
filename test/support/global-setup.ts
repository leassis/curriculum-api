import { migrate } from "../../src/db/migrate";
import { TEST_DATABASE_URL } from "./db";

export default async function setup(): Promise<void> {
  await migrate(TEST_DATABASE_URL);
}
