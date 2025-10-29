import { z } from "zod";

const OPTIONS_COUNT = 4 as const;

export const ItemSchema = z.object({
  index: z.number().int().min(1).max(20),
  type: z.enum(["main","random","boss"]),
  question: z.string().min(5),

  // EXACTAMENTE 4 opciones
  options: z.array(z.string().min(1)).length(OPTIONS_COUNT),

  // Si no viene, asumimos single (puedes quitar default si no lo quieres)
  multi: z.boolean().optional(),

  // Respuesta(s) 1-based
  answerIndex: z.number().int().min(1).optional(),
  answerKeys: z.array(z.number().int().min(1)).optional(),

  explanation: z.string().min(5)
})
// Debe haber answerIndex o answerKeys acorde a multi
.refine(o => (o.multi ? !!o.answerKeys?.length : o.answerIndex !== undefined), {
  message: "Debe haber answerIndex o answerKeys acorde a multi"
})
// Índices dentro del rango de opciones y sin duplicados en multi
.refine(o => {
  const max = o.options.length; // será 4
  if (o.multi) {
    if (!o.answerKeys || o.answerKeys.length === 0) return false;
    // todas dentro de [1..max] y sin duplicados
    const inRange = o.answerKeys.every(k => k >= 1 && k <= max);
    const unique = new Set(o.answerKeys).size === o.answerKeys.length;
    return inRange && unique;
  } else {
    if (o.answerIndex === undefined) return false;
    return o.answerIndex >= 1 && o.answerIndex <= max;
  }
}, { message: "Las respuestas deben estar entre 1 y el número de opciones, sin duplicados." });

export const IAResponseSchema = z.object({
  items: z.array(ItemSchema).length(20)
});

export type IAItemValidated = z.infer<typeof ItemSchema>;
