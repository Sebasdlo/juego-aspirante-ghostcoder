export interface IAProvider {
  name: string;
  generateItems(params: { level: string; seed?: number; count: number }): Promise<unknown>;
}

// Mock por defecto (reemplaza por llamada real)
export const MockProvider: IAProvider = {
  name: "mock",
  async generateItems({ level, count }) {
    return { ok: true, level, count, ts: Date.now() };
  }
};
