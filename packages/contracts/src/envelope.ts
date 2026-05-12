/**
 * The single JSON envelope every Builder REST endpoint returns. Consumers branch on `ok`.
 */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    /** Stable machine code, e.g. `"not_found"`, `"unpublished"`, `"validation_error"`. */
    code: string;
    /** Human-readable explanation; safe to surface in logs. */
    message: string;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export function apiOk<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function apiErr(code: string, message: string): ApiError {
  return { ok: false, error: { code, message } };
}
