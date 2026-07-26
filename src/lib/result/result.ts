export type Result<T, E> =
  Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;

export function isSuccess<T, E>(
  result: Result<T, E>,
): result is Readonly<{
  ok: true;
  value: T;
}> {
  return result.ok;
}
