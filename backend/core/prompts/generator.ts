import { IAProvider, MockProvider } from "./provider.js";
import { IAResponseSchema } from "./moderation.js";

// Aquí conectarás el provider real (OpenAI/Anthropic) cuando lo tengas.
export async function generateItemsWithIA(provider?: IAProvider) {
  const p = provider ?? MockProvider;
  const raw = await p.generateItems({ level: "junior", count: 20 });
  // En un real, validarías raw contra IAResponseSchema
  // IAResponseSchema.parse(raw);
  return raw;
}
