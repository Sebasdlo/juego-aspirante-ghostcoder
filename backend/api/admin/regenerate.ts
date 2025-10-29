import { VercelRequest, VercelResponse } from "@vercel/node";
import { startLevel } from "../../core/game/engine.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId = "admin", level = "junior" } = (req.body || {}) as {
    userId?: string;
    level?: string;
  };

  // MVP: reutiliza startLevel (si hay un set 'open' lo reusa; si no, crea uno nuevo)
  const set = startLevel(String(userId), String(level));

  return res.json({
    ok: true,
    setId: set.setId,
    level: set.level,
    items: set.items.length,
    status: set.status,
  });
}
