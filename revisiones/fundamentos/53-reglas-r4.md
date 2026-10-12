# Reglas comunes, ronda 4 (redactores de Fundamentos)

Plan aprobado: hub/52-plan-r4.md (aplica TODO lo de tu página). Textos exactos y citas: hub/44-experto-r4.md (manda en datos; úsalo tal cual), hub/43-editor-r4.md, hub/42-pedagogo-r4.md; lector: hub/41-junior-r4.md. Descargas: scratchpad/docs/*.txt, motor/*.txt, dl3/*.
Decisiones del usuario: ejercicio del repaso rehecho y encadenado (del stage lento a la línea); ruta al Spark UI de una ejecución terminada en spark-ui.html; Photon pasa a arquitectura (#photon) y el detalle de modos de acceso/versiones de Spark Connect pasa a azure.html; guía de 2023 etiquetada una vez por página (regla nueva en CLAUDE.md, "Content conventions": léela). Lo que solo confirma la ejecución: "es lo que se observa; la doc no lo detalla", UNA vez en la página dueña. No ejecutes nada en Databricks.

## Ya hecho por el hub (no lo toques)
- app.js: DAG smj/aggsort "200 tasks (o menos con AQE)"; DAG bhj con label "Job(s) · la acción write" y Stage 0 "(este stage puede salir en otro job)"; su info ya no da los 300 s: enlaza a joins.html#umbrales (el redactor de joins debe crear id="umbrales" donde vaya broadcastTimeout, en "Hints, umbrales y cómo comprobarlo"); DAG narrow "128 MiB"; pie del DAG enlaza a arquitectura.html#photon (el redactor de arquitectura crea ese id); veredicto de shuffle "guía de 2023"; veredicto "1 TASK" con "Si el stage es largo".
- glossary.json: broadcast (un lado entero, el que el tipo de join deja copiar), Photon (por defecto en clásico, Catalyst planea), Event Timeline (sin "fases"), AQE, job (observado), hint (nuevo), cache/caché (nuevo).
- CLAUDE.md: regla de la guía de 2023.
- No toques app.js, style.css, glossary.json, _layouts, _data, CLAUDE.md ni páginas ajenas salvo las que tu encargo nombre. No ejecutes jekyll build/serve. Si necesitas algo compartido, dilo en el informe.

## Predicciones (marcado igual que r2/r3)
- Nada antes de la pregunta da su respuesta (incluidos esencial, tablas, títulos, entradillas, opciones con explicación dentro). Revísalo una a una.
- Opciones de longitud parecida, sin absolutos ("Siempre", "Nunca") que delaten la incorrecta.
- El comentario de cada distractor nombra el error real que lleva a elegirlo, sin usar conceptos que aún no se han explicado.
- Sin enlaces externos dentro de los comentarios de opción (van en la explicación o en Fuentes).

## Convenciones
Español. Par Azure con title "La misma página en la documentación de Azure Databricks". Externos con target="_blank" rel="noopener". Fuentes nuevas en `<p class="src">`. Guía de RDD con su etiqueta. "el DAG". MiB/GiB para lo que muestra Spark. No cambies IDs de simuladores ni anclas enlazadas (#quien-hace-que, #serverless, #particiones, #narrow-wide, #repartition-coalesce, #varios-jobs, #explain, #skipped, #donde-mirar, #cuantos-stages, #waves, #cuantas-tasks, #varios-stages, #anadir-workers, #map-reduce, #archivos-intermedios, #agregacion-parcial, #metricas, #como-decide, #en-runtime, #photon (joins), #js-sim, #ex-sim, #una-accion-dos-jobs (aqe), #otras-funciones (aqe), #logs y #ruta-diagnostico (spark-ui)). Frases de una idea.

## Informe final (breve)
Cambios por bloque (archivo:línea), qué NO aplicaste y por qué, datos nuevos con URL, cambios necesarios en archivos compartidos.
