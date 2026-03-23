export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClientOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

function toAbsoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function getErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    if ('message' in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    if ('error' in payload) {
      const error = (payload as { error?: { message?: unknown } }).error;
      if (
        error &&
        typeof error.message === 'string' &&
        error.message.trim().length > 0
      ) {
        return error.message;
      }
    }
  }

  return `Request failed with status ${status}`;
}

export async function apiClient<TResponse = unknown, TBody = unknown>(
  path: string,
  options: ApiClientOptions<TBody> = {}
): Promise<TResponse> {
  const method = options.method ?? 'GET';
  const isFormData = options.body instanceof FormData;
  const hasBody = options.body !== undefined;
  const body = !hasBody
    ? undefined
    : isFormData
      ? (options.body as FormData)
      : JSON.stringify(options.body);

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  if (hasBody && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(toAbsoluteUrl(path), {
    method,
    headers,
    body,
    signal: options.signal,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload: unknown = isJson
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status));
  }

  return payload as TResponse;
}
