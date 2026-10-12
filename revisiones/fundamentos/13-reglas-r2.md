# Reglas comunes, ronda 2 (redactores de Fundamentos)

Plan aprobado: scratchpad/hub/12-plan-r2.md (aplica TODO lo de tu página: secciones A, B, C, D, F; la G NO se aprobó: no hay página de repaso). Evidencia: hub/11-junior-r2.md. Citas: scratchpad/motor/*.txt y scratchpad/dl3/*. Decisión del usuario: lo que solo se confirmaría ejecutando (show() lee 1 partición, count() con Exchange SinglePartition, broadcast como job aparte) se REESCRIBE sin el dato ("la doc no lo dice; míralo en el Spark UI") y se quitan las predicciones que dependan de ello.

## Ya hecho por el hub (no lo toques)
- Componente de predicción nuevo en src/assets/style.css y src/assets/app.js (JS genérico sobre [data-guess]). El marcado antiguo (ol/li + botón "Ya lo pensé") YA NO FUNCIONA: convierte TODAS las predicciones de tu página al marcado nuevo.
- app.js: DAG y línea de tiempo numerados desde 0 (Job 0, Stage 0…); broadcast sin "job aparte" (texto con broadcastTimeout); FIFO quitado; "tarea"→"task"; el simulador de shuffle paso a paso usa 2 executors (MAPEX=[1,1,2], REDEX=[1,2,1,2]); "Es lo que pasa con una ventana o un join" → "cuando no hay agregación parcial, por ejemplo en un join"; caption "Esta vista no muestra cores (están en la pestaña Executors)".
- glossary.json: job/acción ("puede verse como varios"), Exchange, AQE, Event Timeline (sin "7 fases"), shuffle hash join, WholeStageCodegen, y nuevas RDD, serialización, Catalyst. No lo toques.
- Anclas: spark-ui.html#logs (nuevo), stages.html#varios-stages, #anadir-workers, #waves, #cuantas-tasks; plan-ejecucion.html#particiones, #narrow-wide, #repartition-coalesce, #varios-jobs, #explain; shuffle.html#map-reduce, #archivos-intermedios, #agregacion-parcial, #metricas; joins.html#como-decide; arquitectura.html#quien-hace-que, #serverless; remedios.html#auto; aqe.html#otras-funciones, #una-accion-dos-jobs; diagnostico.html#summary-metrics; spark-ui.html#ruta-diagnostico; mantenimiento-delta.html#estadisticas.
- stages.html: párrafo tras el Simulador 3 ya corregido (Stages 0 y 1; broadcast con broadcastTimeout). shuffle.html: título del simulador paso a paso ya dice "2 executors".
- No toques app.js, style.css, glossary.json, _layouts ni páginas ajenas. No ejecutes jekyll build/serve. Si necesitas algo compartido, dilo en el informe.

## Marcado nuevo de predicción (OBLIGATORIO)
```html
<div class="guess q" data-guess data-answer="c">
  <div class="guess-cover">
    <p><b>Predice:</b> {pregunta con cifras}</p>
    <div class="guess-opts" role="group" aria-label="Opciones">
      <button type="button" data-opt="a">a) {opción}</button>
      <button type="button" data-opt="b">b) {opción}</button>
      <button type="button" data-opt="c">c) {opción}</button>
    </div>
  </div>
  <div class="guess-fb" data-for="a"><p><b>No.</b> Suponías {modelo roto}; falla porque {causa}.</p></div>
  <div class="guess-fb" data-for="b"><p><b>No.</b> …</p></div>
  <div class="guess-fb" data-for="c"><p><b>Sí.</b> {por qué, en una o dos frases}.</p></div>
  <div class="guess-body">
    <p><b>Compruébalo:</b> {acción exacta en el simulador}.</p>
    <p>{explicación completa}</p>
  </div>
</div>
```
- Al pulsar una opción el lector ve SOLO el comentario de esa opción y un botón "Ver la explicación completa" (lo crea el JS). No pongas la respuesta en la pregunta ni en el comentario de otra opción.
- Reparte la letra correcta (no siempre b; que no sea siempre la del medio). Hay 3-4 opciones; cada incorrecta = un modelo roto con nombre.
- Nada antes de la pregunta (título, viñeta, Lo esencial, párrafo) puede dar su respuesta. Si Lo esencial da la regla, la predicción pide APLICARLA a un caso nuevo.
- Máximo 3 por página.

## Convenciones
Español. Docs de Databricks con par `<a class="az">Azure</a>`. Externos con target="_blank" rel="noopener". Fuentes nuevas también en `<p class="src">` (mismo formato que el resto: comas y punto final). Guía de RDD solo con la etiqueta "(guía de RDD; el mecanismo es el mismo para DataFrames)". No cambies IDs de simuladores. Frases de una idea. Lo que no tenga fuente, se reescribe o se quita.

## Informe final (breve)
Cambios por bloque (archivo:línea), qué NO aplicaste y por qué, datos nuevos con URL, y cambios necesarios en archivos compartidos.
