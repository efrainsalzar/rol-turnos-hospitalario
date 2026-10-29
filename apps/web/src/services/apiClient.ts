import { clearStoredActiveSession, getStoredActiveSessionToken } from './sessionStorage';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Sin timeout, una peticion colgada (backend lento, o simplemente sin
// respuesta) deja el estado de carga de la pantalla en `true` para siempre,
// sin error ni forma de recuperarse salvo recargar toda la pagina. Ver
// docs/frontend/estrategia-resiliencia-red.md para el diagnostico completo.
const DEFAULT_TIMEOUT_MS = 20000;
const BLOB_TIMEOUT_MS = 45000;

export class ApiClientError extends Error {
  status: number;
  body?: Record<string, unknown>;

  constructor(message: string, status: number, body?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

// El backend devuelve este codigo (HttpExceptionFilter) cuando el pool de
// conexiones a SQL Server se agoto antes de que la request llegara a ejecutar
// ninguna consulta (ver docs/rendimiento/estrategia-escalabilidad-matriz-mensual.md,
// capa 4) — es seguro reintentar automaticamente porque nada se escribio
// todavia del lado del servidor.
export const isPoolSaturatedError = (error: unknown): boolean =>
  error instanceof ApiClientError && error.status === 503 && error.body?.code === 'POOL_SATURADO';

const wait = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs));

// Reintento acotado (no generico) para operaciones que ya confirmaron ser
// idempotentes bajo reintento — hoy solo el guardado en lote de celdas de la
// matriz. No usar esto por defecto en cualquier request: para un endpoint que
// no garantice idempotencia bajo escritura parcial, reintentar a ciegas podria
// duplicar efectos.
export const withBoundedRetryOnPoolSaturation = async <T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> => {
  const delaysMs = [300, 800];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isPoolSaturatedError(error) || attempt >= maxRetries) {
        throw error;
      }
      await wait(delaysMs[Math.min(attempt, delaysMs.length - 1)]);
    }
  }
};

const withTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId)
  };
};

const fetchConTimeout = async (url: string, init: RequestInit, timeoutMs: number, path: string): Promise<Response> => {
  const { signal, cleanup } = withTimeoutSignal(timeoutMs);

  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError('La solicitud tardo demasiado. Verifica tu conexion e intenta de nuevo.', 408);
    }
    throw new ApiClientError(`No se pudo conectar con el servidor (${path}). Verifica tu conexion e intenta de nuevo.`, 0);
  } finally {
    cleanup();
  }
};

const buildUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const parseErrorBody = async (response: Response): Promise<Record<string, unknown> | undefined> => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const extractErrorMessage = (body: Record<string, unknown> | undefined) => {
  const message = body?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return undefined;
};

const buildApiError = async (response: Response, path: string): Promise<ApiClientError> => {
  const body = await parseErrorBody(response);
  const rawMessage = extractErrorMessage(body) || `La API respondio con estado ${response.status}.`;
  const message = normalizeApiErrorMessage(rawMessage, response.status, path);
  return new ApiClientError(message, response.status, body);
};

const normalizeApiErrorMessage = (message: string, status: number, path: string) => {
  if (status === 401 && !path.includes('/auth/login')) {
    clearStoredActiveSession();
    return 'La sesion activa ya no es valida o fue cerrada. Inicia sesion otra vez para continuar.';
  }

  return message;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
}

const request = async <T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = buildHeaders(options.body !== undefined);

  const response = await fetchConTimeout(
    buildUrl(path),
    {
      headers,
      method,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    },
    DEFAULT_TIMEOUT_MS,
    path
  );

  if (!response.ok) {
    throw await buildApiError(response, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const contentLength = response.headers.get('content-length');

  if (contentLength === '0') {
    return undefined as T;
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text();
    if (!text.trim()) {
      return undefined as T;
    }
    return text as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};

const requestBlob = async (path: string): Promise<Blob> => {
  const response = await fetchConTimeout(
    buildUrl(path),
    {
      headers: buildHeaders(false),
      method: 'GET'
    },
    BLOB_TIMEOUT_MS,
    path
  );

  if (!response.ok) {
    throw await buildApiError(response, path);
  }

  return response.blob();
};

const requestBlobWithBody = async (path: string, body?: unknown): Promise<Blob> => {
  const response = await fetchConTimeout(
    buildUrl(path),
    {
      headers: buildHeaders(body !== undefined),
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined
    },
    BLOB_TIMEOUT_MS,
    path
  );

  if (!response.ok) {
    throw await buildApiError(response, path);
  }

  return response.blob();
};

const requestText = async (path: string): Promise<string> => {
  const response = await fetchConTimeout(
    buildUrl(path),
    {
      headers: buildHeaders(false),
      method: 'GET'
    },
    DEFAULT_TIMEOUT_MS,
    path
  );

  if (!response.ok) {
    throw await buildApiError(response, path);
  }

  return response.text();
};

const buildHeaders = (hasBody: boolean) => {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  const tokenSesion = getStoredActiveSessionToken();

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (tokenSesion) {
    headers.Authorization = `Bearer ${tokenSesion}`;
  }

  return headers;
};

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, { body });
  },
  async patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, { body });
  },
  async put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, { body });
  },
  async delete(path: string): Promise<void> {
    await request<void>('DELETE', path);
  },
  async getBlob(path: string): Promise<Blob> {
    return requestBlob(path);
  },
  async postBlob(path: string, body?: unknown): Promise<Blob> {
    return requestBlobWithBody(path, body);
  },
  async getText(path: string): Promise<string> {
    return requestText(path);
  }
};
