// Ajustado a tu carpeta real: src/modules/scenes/assets/Junior
// OJO: usa SIEMPRE "/" (slash) en rutas, no "\".

import bgInicio from './Junior/inicio.png'
import bgReto from './Junior/reto.png'
import bgJefe from './Junior/jefe.png'
import bgResultado from './Junior/progreso_resultado.png'
import bgMentor from './Junior/mentor_del_reto.png'

import bgRetoSenior from './Senior/Reto_actual_senior.png'
import bgJefeSenior from './Senior/Jefe_senior.png'
import bgResultadoSenior from './Senior/Resultado_progreso_senior.png'
import bgMentorSenior from './Senior/Mentores_senior.png'

import bgRetoMaster from './Master/Reto_actual_Master.png'
import bgJefeMaster from './Master/Prueba_Final.png'
import bgResultadoMaster from './Master/Resultado_progreso_master.png'
import bgMentorMaster from './Master/Lideres_Master.png'
import bgFinalGame from './Master/FinalGame.png'

// Personajes (nombres con paréntesis/espacios funcionan, pero es mejor renombrar a kebab-case luego)
import charCamila from './Junior/Camila_(back-end).png'
import charDiego from './Junior/Diego_(seguridad).png'
import charHernan from './Junior/Hernán_(automatización).png'
import charLucia from './Junior/Lucía_(datos).png'
import charSofia from './Junior/Sofía_(soluciones).png'
import charBoss from './Junior/jefe_nivel_Ramires.png'

import charAdriana from './Senior/Adriana_ing_datos.png'
import charClara from './Senior/Clara_Analista_ciberseguridad.png'
import charElian from './Senior/Elian_software.png'
import charRafael from './Senior/Rafael_sistemas_distribuidos.png'
import charTania from './Senior/Tania_ing_redimiento.png'
import charBosSenior from './Senior/jefe_sebas_senior.png'

import charBossMaster from './Master/Fundador.png'
import charMateo from './Master/Mateo_Seguridad_Global.png'
import charElena from './Master/Elena_Integridad_Operativa.png'
import charHaru from './Master/Haru_Ética.png'
import charRebeca from './Master/Rebeca_Arquitecta_Continuidad.png'
import charVictor from './Master/Victor_Infraestructura_Global.png'


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
