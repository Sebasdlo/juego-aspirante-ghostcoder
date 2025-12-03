// modules/api/client.ts
// ------------------------------------------------------
//  CLIENTE HTTP + CLIENTE SUPABASE EN UN SOLO ARCHIVO
// ------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

// ===============================
//  1) CLIENTE HTTP (Backend API)
// ===============================
const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api';

type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
};

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const resp = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    body: options.body ?? null
  });

  const rawText = await resp.text();
  let data: any = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!resp.ok) {
    const message =
      data?.error?.message ??
      data?.message ??
      `HTTP ${resp.status} ${resp.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

// ===============================
//  2) SUPABASE CLIENT (Realtime)
// ===============================

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    },
    realtime: {
      params: {
        eventsPerSecond: 5
      }
    }
  }
);
