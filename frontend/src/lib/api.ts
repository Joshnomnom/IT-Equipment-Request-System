/** Error thrown for any non-2xx response, carrying the HTTP status. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Shape of NestJS error bodies. `message` is an array for validation errors. */
interface NestErrorBody {
  message?: string | string[];
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Lets AuthProvider react when any API call reports the session is gone. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
}

/**
 * Typed fetch for the backend. Requests go to the same origin (/api/*) and
 * Next.js proxies them, so the browser sends the httpOnly cookie automatically.
 */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      credentials: "same-origin",
      headers: {
        ...(json !== undefined && { "Content-Type": "application/json" }),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Please try again.");
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    // /auth/* handles its own 401s (wrong password, not logged in yet).
    if (response.status === 401 && !path.startsWith("/auth/")) {
      onUnauthorized?.();
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as NestErrorBody;
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (body.message) return body.message;
  } catch {
    // Body wasn't JSON (e.g. proxy error page) — fall through.
  }
  return response.status >= 500
    ? "Something went wrong on the server."
    : `Request failed (${response.status})`;
}
