// Ajustado a tu carpeta real: src/modules/scenes/assets/Junior
// OJO: usa SIEMPRE "/" (slash) en rutas, no "\".

import bgInicio from './Junior/inicio.png'
import bgReto from './Junior/reto.png'
import bgJefe from './Junior/jefe.png'
import bgResultado from './Junior/progreso_resultado.png'
import bgMentor from './Junior//mentor_del_reto.png'

// Personajes (nombres con paréntesis/espacios funcionan, pero es mejor renombrar a kebab-case luego)
import charCamila from './Junior/Camila_(back-end).png'
import charDiego from './Junior/Diego_(seguridad).png'
import charHernan from './Junior/Hernán_(automatización).png'
import charLucia from './Junior/Lucía_(datos).png'
import charSofia from './Junior/Sofía_(soluciones).png'
import charBoss from './Junior/jefe_nivel_Ramires.png'

export const assets = {
  bg: {
    inicio: bgInicio,
    reto: bgReto,
    jefes: bgJefe,
    resultado: bgResultado,
    mentor: bgMentor,
  },
  characters: {
    camila: charCamila,
    diego: charDiego,
    hernan: charHernan,
    lucia: charLucia,
    sofia: charSofia,
    boss: charBoss,
  },
} as const
