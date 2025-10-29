import { TooMany } from "../ops/errors.js";
import { ENV } from "../../config/env.js";

// in-memory, suficiente para entrega
const buckets = new Map<string, { count: number; ts: number }>();

export function rateLimit(key: string) {
  const now = Date.now();
  const win = ENV.RATE_LIMIT_WINDOW_MS;
  const max = ENV.RATE_LIMIT_MAX_REQUESTS;
  const entry = buckets.get(key);
  if (!entry || now - entry.ts > win) {
    buckets.set(key, { count: 1, ts: now });
    return;
  }
  entry.count++;
  if (entry.count > max) throw TooMany("Rate limit exceeded");
}

