// backend/db/client.ts
import fs from "node:fs";
import path from "node:path";

type AnyObj = Record<string, any>;

const DATA_DIR = path.join(process.cwd(), ".localdata");
const FILE = path.join(DATA_DIR, "sets.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ byUserLevel:{}, bySetId:{} }, null, 2));
}

export function readStore(): { byUserLevel: AnyObj; bySetId: AnyObj } {
  ensureFile();
  const raw = fs.readFileSync(FILE, "utf8");
  return JSON.parse(raw || `{"byUserLevel":{},"bySetId":{}}`);
}

export function writeStore(data: { byUserLevel: AnyObj; bySetId: AnyObj }) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
