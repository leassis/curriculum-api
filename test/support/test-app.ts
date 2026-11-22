import { buildApp, type ExtendApi } from "../../src/app";
import type { CurriculumApiConfig } from "../../src/config";
import { createContainer, type Services } from "../../src/container";
import { resolvedConfig } from "./config";

/** Builds the app with the real container (no I/O) and optional service overrides. */
export function createTestApp(
  opts: {
    config?: Partial<CurriculumApiConfig>;
    services?: Partial<Services>;
    extend?: ExtendApi;
  } = {},
) {
  const config = resolvedConfig(opts.config);
  const services: Services = { ...createContainer(config), ...opts.services };
  return { app: buildApp(config, services, opts.extend), config, services };
}
