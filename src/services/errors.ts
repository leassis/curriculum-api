/** Domain errors carry their HTTP status so the API and admin handlers share one mapping. */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;
}

export class ValidationError extends DomainError {
  readonly code = "validation_error";
  readonly status = 400;
  constructor(
    message = "Invalid input",
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "unauthorized";
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "forbidden";
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class CaptchaFailedError extends DomainError {
  readonly code = "captcha_failed";
  readonly status = 403;
  constructor(message = "Captcha verification failed") {
    super(message);
    this.name = "CaptchaFailedError";
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found";
  readonly status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ChatRevokedError extends DomainError {
  readonly code = "chat_revoked";
  readonly status = 410;
  constructor(message = "This chat was revoked") {
    super(message);
    this.name = "ChatRevokedError";
  }
}

export class ChatExpiredError extends DomainError {
  readonly code = "chat_expired";
  readonly status = 410;
  constructor(message = "This chat expired") {
    super(message);
    this.name = "ChatExpiredError";
  }
}

export class LimitReachedError extends DomainError {
  readonly code = "limit_reached";
  readonly status = 429;
  constructor(message = "Limit reached") {
    super(message);
    this.name = "LimitReachedError";
  }
}

export class LlmUnavailableError extends DomainError {
  readonly code = "llm_unavailable";
  readonly status = 502;
  constructor(message = "The language model is unavailable") {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

/** The message never includes the leaked value; only the field key. */
export class PiiLeakError extends DomainError {
  readonly code = "internal_error";
  readonly status = 500;
  constructor(readonly fieldKey: string) {
    super(`Personal info field "${fieldKey}" found in an LLM prompt`);
    this.name = "PiiLeakError";
  }
}

export class ConfigError extends DomainError {
  readonly code = "config_error";
  readonly status = 500;
  constructor(readonly fields: string[]) {
    super(`Invalid configuration: ${fields.join(", ")}`);
    this.name = "ConfigError";
  }
}

export class DecryptionError extends DomainError {
  readonly code = "internal_error";
  readonly status = 500;
  constructor(message = "Could not decrypt value") {
    super(message);
    this.name = "DecryptionError";
  }
}

/** The model answered, but its reply did not parse against the requested schema. */
export class LlmOutputInvalidError extends DomainError {
  readonly code = "llm_output_invalid";
  readonly status = 502;
  constructor(message = "The language model returned invalid output") {
    super(message);
    this.name = "LlmOutputInvalidError";
  }
}
