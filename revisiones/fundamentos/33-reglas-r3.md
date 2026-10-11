# Reglas comunes, ronda 3 (redactores de Fundamentos)

Plan aprobado: hub/32-plan-r3.md (aplica TODO lo de tu página, secciones A–K). Evidencia y textos exactos propuestos: hub/21-junior-r3.md, hub/22-pedagogo-r3.md, hub/23-editor-r3.md, hub/24-experto-r3.md (24 tiene las correcciones con su cita y URL: úsalas tal cual). Citas descargadas: scratchpad/docs/*.txt, scratchpad/motor/*.txt, scratchpad/dl3/*.
Decisiones del usuario: página propia de repaso (repaso-fundamentos); arquitectura pasa a 14 particiones; MiB/GiB en todo, como el Spark UI; joins se parte (#como-decide + #en-runtime) y range joins se resume. Lo que solo se confirmaría ejecutando: "con aviso" (es lo habitual / observado en el Spark UI; la doc no lo detalla), UNA vez, en la página dueña; en las demás, enlace. No ejecutes nada en Databricks.

## Ya hecho por el hub (no lo toques)
- app.js: simulador de shuffle (sw-*) con UI.bytes (MiB/GiB) y veredicto "RIESGO DE SPILL" (umbral 200 MiB, enlace a memoria-oom, guía de 2023 etiquetada); VACÍAS "Con AQE activo (por defecto, salvo en streaming), AQE puede unirlas"; paso 1 del shuffle paso a paso sin "módulo"; DAG sin puntos y con "motor de Spark sin Photon" en el pie (enlaza joins.html#photon: ese id debe seguir existiendo); Event Timeline del Sim 3 con la frase del driver y "Motor de Spark sin Photon"; tarjetas de casos con id propio: casos.html#join-explota, #broadcast-2g, #broadcast-off, #una-task, #spill-todas, etc.
- glossary.json: DAG (nuevo), estadísticas (nuevo), AQE, job, acción, wave (ejemplo 14 tasks/12 cores → 2 waves, la segunda con 2), WholeStageCodegen, serialización con deserializada/deserializar.
- remedios.html#auto: orden de reglas (auto → datos ÷ 128 MB a múltiplo de cores → 2–3× cores si no sabes el tamaño), todo etiquetado como guía de 2023.
- _data/pages.yml: repaso-fundamentos tras joins.
- Repaso actual de joins copiado en hub/repaso-joins-r2.html.
- No toques app.js, style.css, glossary.json, _layouts, _data ni páginas ajenas. No ejecutes jekyll build/serve. Si necesitas algo compartido, dilo en el informe.

## Marcado de predicción (igual que r2)
```html
<div class="guess q" data-guess data-answer="c">
  <div class="guess-cover">
    <p><b>Predice:</b> {pregunta}</p>
    <div class="guess-opts" role="group" aria-label="Opciones">
      <button type="button" data-opt="a">a) …</button> …
    </div>
  </div>
  <div class="guess-fb" data-for="a"><p><b>No.</b> Suponías {modelo roto}; falla porque {causa}.</p></div> …
  <div class="guess-body"><p><b>Compruébalo:</b> …</p><p>…</p></div>
</div>
```
- Nada antes de la pregunta (título, esencial, Idea mental, párrafo, paso) puede dar su respuesta. Comprueba esto expresamente para cada predicción de tu página.
- El comentario de cada distractor describe el error que de verdad lleva a elegirlo.
- Máximo 3 por página (el repaso es la excepción).

## Convenciones
Español. Docs de Databricks con par `<a class="az" … title="La misma página en la documentación de Azure Databricks">Azure</a>`, sin " · " entre ellos. Externos con target="_blank" rel="noopener". Fuentes nuevas también en `<p class="src">`. Guía de RDD solo con "(guía de RDD; el mecanismo es el mismo para DataFrames)". Guía de 2023 siempre con "(guía de optimización de 2023; no es documentación oficial)". "el DAG" (masculino). Unidades MiB/GiB cuando hablas de lo que muestra Spark (umbral de 10 MB = 10 MiB: aclarado una vez en joins). No cambies IDs de simuladores ni anclas que otras páginas enlazan (#quien-hace-que, #serverless, #particiones, #narrow-wide, #repartition-coalesce, #varios-jobs, #explain, #waves, #cuantas-tasks, #varios-stages, #anadir-workers, #map-reduce, #archivos-intermedios, #agregacion-parcial, #metricas, #como-decide, #photon, #js-sim). Frases de una idea.

## Informe final (breve)
Cambios por bloque (archivo:línea), qué NO aplicaste y por qué, datos nuevos con URL, cambios necesarios en archivos compartidos.
