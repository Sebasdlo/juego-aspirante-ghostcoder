-- ================================
-- 0) NARRATIVA GLOBAL DEL JUEGO
-- ================================
insert into game_narrative (slug, title, body_markdown, locale, version)
values (
  'historia-base',
  'Narrativa del Juego — GhostCoder',
  $$El mundo se encuentra en una economía totalmente digitalizada, donde la mayor
parte de los procesos sociales, económicos y políticos dependen de inteligencias artificiales
distribuidas en gigantescas infraestructuras en la nube. Las empresas más poderosas son las
Corporaciones de Código, consorcios que controlan, mantienen y expanden el alcance de
estas IA que gobiernan la vida moderna.

Entre ellas destaca la Corporación GhostCoder, una de las más prestigiosas y
enigmáticas. A diferencia de las demás, no trabaja a favor de las IA, sino que compite
contra ellas, defendiendo la permanencia del ingenio humano en un mundo dominado por
algoritmos. GhostCoder sostiene que la lógica, la intuición, la ética y la creatividad son
armas que ninguna máquina puede replicar del todo.

La corporación fue fundada dos décadas atrás, en un momento en que las IA
desplazaban masivamente a los programadores humanos. Mientras la mayoría aceptaba la
automatización total, un grupo de ingenieros rebeldes, liderados por Armand Keller, creó
GhostCoder bajo un lema que se convirtió en estandarte:
**“El ingenio humano nunca puede ser replicado por completo.”**

Desde entonces, GhostCoder se ha consolidado como la última frontera de la
programación humana. Sus miembros no son simples empleados: son guerreros del código,
seleccionados mediante duras simulaciones narrativas inmersivas que ponen a prueba no
solo su lógica y capacidad técnica, sino también su ética y juicio en situaciones límite. Cada
aspirante que busca ingresar debe demostrar que está al nivel de las IA, compitiendo en su
propio terreno, pero con la ventaja del criterio humano.$$,
  'es-CO',
  1
)
on conflict (slug) do update
set title = excluded.title,
    body_markdown = excluded.body_markdown,
    locale = excluded.locale,
    version = excluded.version;

-- ================================
-- 1) NIVELES
-- ================================
insert into level(key, display_name, rules_json) values
('junior','Nivel Junior', '{"needed":10,"total_main":10,"total_random":5,"total_boss":5}'),
('senior','Nivel Senior', '{"needed":12,"total_main":10,"total_random":5,"total_boss":5}'),
('master','Nivel Máster', '{"needed":14,"total_main":10,"total_random":5,"total_boss":5}')
on conflict (key) do nothing;

-- ================================
-- 2) CONTEXTO DEL NIVEL JUNIOR (tu texto)
-- ================================
insert into level_context(level_key, title, summary, intro_markdown, objectives, locale, version)
values (
  'junior',
  'Contexto del Nivel Junior',
  'Interacción con cinco mentores, desafíos aleatorios y evaluación integradora.',
  $$Dentro de este espacio el Aspirante debe interactuar con cinco empleados
experimentados, cada uno especializado en un área distinta, que le asignarán dos retos
prácticos a través del simulador.

• Camila, desarrolladora de back-end, lo enfrenta a condicionales y validaciones básicas.
• Hernán, un ingeniero de automatización, lo guiará en la creación de ciclos y flujos
repetitivos.
• Sofía, analista de soluciones, lo retará a transformar requisitos narrativos en
pseudocódigo claro y funcional.
• Diego, especialista en seguridad, planteará dilemas éticos donde debe elegir entre
rapidez y protección.
• Lucía, arquitecta de datos, le asignará tareas para organizar información y detectar
inconsistencias en registros.

A medida que el aprendiz avanza en estas pruebas, el ingeniero Ramírez activa
cinco desafíos aleatorios que simulan incidentes imprevistos del entorno laboral: corregir
módulos mal planteados, optimizar procesos ineficientes, reescribir pseudocódigo
incompleto, tomar decisiones éticas en despliegues críticos e integrar múltiples piezas en
una solución funcional. Estos retos inesperados rompen la rutina de la simulación y ponen a
prueba su capacidad de adaptación.

En la etapa final, Ramírez evalúa directamente al aspirante con cinco pruebas
integradoras, más exigentes y prolongadas, que reúnen todo lo aprendido hasta el momento.
Aquí no solo se mide la exactitud de las respuestas, sino también la manera en que se toman
decisiones bajo presión, priorizando entre velocidad, seguridad y eficiencia.

Si el aprendiz logra superar esta evaluación, el jefe lo reconoce para avanzar al
siguiente nivel con una sentencia breve:
“Has demostrado que tu lógica puede estar al nivel de las IA. Bienvenido a
GhostCoder. Prepárate, porque lo que viene ya no será solo simulación: será la realidad.”$$,
  '["Resolver 2 retos por mentor","Superar 5 desafíos aleatorios","Aprobar 5 pruebas integradoras"]'::jsonb,
  'es-CO',
  1
)
on conflict (level_key, title) do update
set summary        = excluded.summary,
    intro_markdown = excluded.intro_markdown,
    objectives     = excluded.objectives,
    locale         = excluded.locale,
    version        = excluded.version;

-- (Placeholders para SENIOR/MASTER, puedes editar luego)
insert into level_context(level_key, title, summary, intro_markdown, objectives, locale, version)
values
('senior','Contexto del Nivel Senior','Retos de arquitectura y trade-offs.',
 'En este nivel profundizas en decisiones de diseño, testing y performance.',
 '["Integrar módulos","Diseñar con patrones","Validar con tests"]','es-CO',1),
('master','Contexto del Nivel Máster','Operación, seguridad y SRE.',
 'Gobiernas la torre de control: incidentes, mitigar ataques, mantener SLOs.',
 '["Mitigar incidentes","Asegurar la red","Mantener SLOs"]','es-CO',1)
on conflict do nothing;

-- ================================
-- 3) MENTORES
-- ================================
insert into character(name, role, bio, image_url, is_mentor) values
('Camila','back-end','Condicionales y validaciones básicas.','/assets/camila.png', true),
('Hernán','automatización','Ciclos y flujos.','/assets/hernan.png', true),
('Sofía','soluciones','Pseudocódigo claro y funcional.','/assets/sofia.png', true),
('Diego','seguridad','Decisiones éticas: rapidez vs protección.','/assets/diego.png', true),
('Lucía','datos','Organizar información y detectar inconsistencias.','/assets/lucia.png', true)
on conflict do nothing;

-- Vincular los 5 mentores a CADA nivel (junior/senior/master)
insert into level_character(level_key, character_id, position)
select l.key, c.id, row_number() over (partition by l.key order by c.name) - 1
from level l cross join character c
where c.is_mentor = true
on conflict do nothing;

-- ================================
-- 4) PROMPT TEMPLATES (v1)
-- ================================
insert into prompt_template(level_key, version, template_text, constraints_json) values
('junior', 1,
 'Genera 20 retos: por cada mentor, 2 main + 1 random; y 5 boss transversales. Formato JSON por ítem: {question, options[4], answer_index(1..4), explanation, kind ∈ main|random|boss, mentorName}.',
 '{"max_options":4,"lang":"es-CO"}'),
('senior', 1,
 'Genera 20 retos senior con la misma distribución (2 main + 1 random por mentor; 5 boss). Enfoca en arquitectura, testing y performance.',
 '{"max_options":4,"lang":"es-CO"}'),
('master', 1,
 'Genera 20 retos master con la misma distribución. Enfoca en seguridad, SRE y fiabilidad.',
 '{"max_options":4,"lang":"es-CO"}')
on conflict (level_key, version) do nothing;

-- ================================
-- 5) USUARIO DEMO (opcional)
-- ================================
insert into app_user(email, display_name)
values ('player@example.com', 'Jugador/a GhostCoder')
on conflict (email) do nothing;
