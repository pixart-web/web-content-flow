export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type AppError = Readonly<{
  code: "VALIDATION" | "AUTH_REQUIRED" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "DEPENDENCY_UNAVAILABLE" | "JOB_STATE" | "INTERNAL";
  message: string;
  retryable: boolean;
  requestId?: string;
  fieldErrors?: FieldErrors;
}>;

export type Result<T, E = AppError> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: E }>;
