// src/modules/api/client.ts
export type HttpInit = RequestInit & {
  timeoutMs?: number;
  retries?: number;
};

// Prioriza VITE_API_URL; fallback a VITE_API_BASE_URL por compatibilidad
const RAW_BASE =
  (import.meta.env as any).VITE_API_URL ||
  (import.meta.env as any).VITE_API_BASE_URL ||
  "";

const BASE = RAW_BASE.replace(/\/+$/, ""); // sin barra final

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}

export async function http<T>(path: string, init: HttpInit = {}): Promise<T> {
  const { timeoutMs = 12000, retries = 0, ...rest } = init;
  let lastErr: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // ⚠️ No fuerces Content-Type en GET: evita preflight CORS
      const method = (rest.method || "GET").toUpperCase();
      const baseHeaders: Record<string, string> = {};
      if (method !== "GET" && method !== "HEAD") {
        baseHeaders["Content-Type"] = "application/json";
      }

      const res = await fetch(buildUrl(path), {
        ...rest,
        method,
        signal: controller.signal,
        headers: {
          ...baseHeaders,
          ...(rest.headers || {}),
        },
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text || "(sin cuerpo)"}`);
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        return (await res.json()) as T;
      } else {
        const text = await res.text();
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new Error(`Respuesta no JSON: ${text.slice(0, 200)}`);
        }
      }
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastErr ?? new Error("Fallo de red");
}
