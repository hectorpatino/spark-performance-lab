# Resumen de la ronda 5 para la revisión del usuario (2026-10-11)

Commits (rama arquitectura-paralelismo-y-agentes, sin push):
- 205fdce chore: agentes en Sonnet salvo los que verifican datos
- a338b10 feat: la predicción como punto de control
- aaee4ea docs: quinta ronda de Fundamentos

## Proceso
1. Verificación de r4 en navegador: 26 predicciones OK, 0 errores, sin overflow a 390 px.
2. Junior a ciegas (61). Pedagogo (62), editor (63) y experto-motor-spark (64) en paralelo.
3. Sin preguntar, el hub lanzó experto-observabilidad (65) y experto-plataforma (66) por dudas de Photon que no eran del motor.
4. Plan 72 y reglas 73. Decisiones del usuario: D1 3 preguntas + ejemplos resueltos en plan; D3 R8 con INNER; D4 cajas Verifícalo → párrafo; D5 renumerar repaso. El hub decidió por defecto: D2 (stages P1 nueva y respuestas c,b,a), D6 (Spark Connect al final de "En Databricks"), pregunta nueva R9 en el repaso.
5. El hub editó: glossary (Photon, SQL warehouse, AQE, job), app.js (VACÍAS), pages.yml (cinco estrategias), aqe.html (streaming sin estado DBR 18.0 + fuente), query-profile.html (COVERAGE_PHOTON, nombre Execution Details), check-guesses.js.
6. Seis redactores, uno por página. El hub corrigió después:
   - stages: quitó One Spark task de Fuentes, porque ya no se citaba;
   - joins: quitó la frase sin fuente "qué lado se copia se sigue decidiendo al planear";
   - plan-ejecucion.js: la pregunta del simulador DAG usa el estilo nuevo.
7. Build, anclas y check-guesses OK; también el simulador DAG: 3 ejemplos resueltos y 2 preguntas.

## Rediseño de la predicción (fuera del hub-spoke, lo hizo el hub)
- style.css: raíl de estado, pregunta en Newsreader, letra como tecla, comentario bajo la opción y opciones no elegidas atenuadas. La animación respeta reduced-motion.
- app.js: transforma "a) …" en tecla, atajos de teclado y mueve el .guess-fb tras la opción elegida.
- Arreglado: el botón Copiar heredaba el estilo de los botones de .guess-cover.

## Agentes
model: sonnet en 8, opus en experto-motor-spark y verificador-fuentes. Se aplica al reiniciar la sesión; los de esta ronda corrieron en Opus.

## Pendientes conocidos (no resueltos)
1. aggsort (plan-ejecucion.js:270-280), app.js:372, plan-ejecucion.js:63, shuffle.html:21 y 63: "orderBy reparte por rangos en shuffle.partitions particiones y cada task ordena su rango" NO tiene fuente oficial (67). La doc solo garantiza orden total (ORDER BY) y documenta rangos y muestreo para repartitionByRange. Además, plan-ejecucion.js:63 atribuye a la doc el muestreo de orderBy (impreciso). Opciones: comprobar con explain() en Databricks (el usuario elige perfil), presentarlo como "lo que se ve en el plan" con aviso, o replantear la pregunta.
2. El simulador del árbol (plan-ejecucion.js:63) muestra "reparte por rangos" si el lector añade orderBy antes de aggsort: puede regalarla.
3. Huecos sin doc, marcados en el sitio: nombres de nodos de Photon; Summary Metrics con Photon; si la salida de una ejecución terminada conserva el desplegable Spark Jobs; si el JSON de un job cluster terminado sigue visible.
4. Ronda 6 (junior a ciegas + experto) sin lanzar; criterio de parada aún sin cumplir.
