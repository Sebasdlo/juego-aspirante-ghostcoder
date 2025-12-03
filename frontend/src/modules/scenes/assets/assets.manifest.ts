// Ajustado a tu carpeta real: src/modules/scenes/assets/Junior
// OJO: usa SIEMPRE "/" (slash) en rutas, no "\".

import bgInicio from './Junior/inicio.png'
import bgReto from './Junior/reto.png'
import bgJefe from './Junior/jefe.png'
import bgResultado from './Junior/progreso_resultado.png'
import bgMentor from './Junior/mentor_del_reto.png'

import bgRetoSenior from './Senior/reto_actual_senior.png'
import bgJefeSenior from './Senior/Jefe_senior.png'
import bgResultadoSenior from './Senior/resultado_progreso_senior.png'
import bgMentorSenior from './Senior/mentores_senior.png'

import bgRetoMaster from './Master/reto_actual_master.png'
import bgJefeMaster from './Master/prueba_final.png'
import bgResultadoMaster from './Master/resultado_progreso_master.png'
import bgMentorMaster from './Master/lideres_master.png'
import bgFinalGame from './Master/finalgame.png'

// Personajes (nombres con paréntesis/espacios funcionan, pero es mejor renombrar a kebab-case luego)
import charCamila from './Junior/camila_backend.png'
import charDiego from './Junior/diego_seguridad.png'
import charHernan from './Junior/hernan_automatizacion.png'
import charLucia from './Junior/lucia_datos.png'
import charSofia from './Junior/sofia_soluciones.png'
import charBoss from './Junior/jefe_nivel_ramirez.png'


import charAdriana from './Senior/adriana_ing_datos.png'
import charClara from './Senior/clara_analista_ciberseguridad.png'
import charElian from './Senior/elian_software.png'
import charRafael from './Senior/rafael_sistemas_distribuidos.png'
import charTania from './Senior/tania_ing_redimiento.png'
import charBosSenior from './Senior/jefe_sebas_senior.png'

import charBossMaster from './Master/fundador.png'
import charMateo from './Master/mateo_seguridad_global.png'
import charElena from './Master/elena_integridad_operativa.png'
import charHaru from './Master/haru_etica.png'
import charRebeca from './Master/rebeca_arquitecta_continuidad.png'
import charVictor from './Master/victor_Infraestructura_global.png'


export const assets = {
  bg: {
    inicio: bgInicio,
    reto: bgReto,
    jefes: bgJefe,
    resultado: bgResultado,
    mentor: bgMentor,
    inicio_senior: bgInicio,
    reto_senior: bgRetoSenior,
    jefes_senior: bgJefeSenior,
    resultado_senior: bgResultadoSenior,
    mentor_senior: bgMentorSenior,
    inicio_master: bgInicio,
    reto_master: bgRetoMaster,
    jefes_master: bgJefeMaster,
    resultado_master: bgResultadoMaster,
    mentor_master: bgMentorMaster,
    finalGame: bgFinalGame,
  },
  characters: {
    camila: charCamila,
    diego: charDiego,
    hernan: charHernan,
    lucia: charLucia,
    sofia: charSofia,
    boss: charBoss,
    adriana: charAdriana,
    clara: charClara,
    elian: charElian,
    rafael: charRafael,
    tania: charTania,
    boss_senior: charBosSenior,
    mateo: charMateo,
    elena: charElena,
    haru: charHaru,
    rebeca: charRebeca,
    victor: charVictor,
    boss_master: charBossMaster,
  },
} as const
