import type { LimitName } from "../config.js";

export const MODEL_AREAS = ["public", "tailor", "recruiter", "import"] as const;
export type ModelArea = (typeof MODEL_AREAS)[number];

export const LIMIT_NAMES = [
  "publicQuestionsPerIpPerDay",
  "recruiterQuestionsDefault",
  "publicMaxOutputTokens",
  "recruiterMaxOutputTokens",
  "maxQuestionChars",
  "maxHistoryMessages",
  "sessionTtlMinutes",
] as const satisfies readonly LimitName[];

export const PAGE_SIZES = ["A4", "Letter"] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const PAGE_SIZE_KEY = "print.pageSize";

export const modelKey = (area: ModelArea) => `model.${area}`;
export const limitKey = (name: LimitName) => `limits.${name}`;
export const temperatureKey = (area: ModelArea) => `temperature.${area}`;

/** Temperature override value meaning "send no temperature" (reasoning models that reject it). */
export const TEMPERATURE_DEFAULT = "default";

/** Every key a Settings Override may use. */
export const SETTINGS_KEYS: readonly string[] = [
  ...MODEL_AREAS.map(modelKey),
  ...LIMIT_NAMES.map(limitKey),
  ...MODEL_AREAS.map(temperatureKey),
  PAGE_SIZE_KEY,
];
