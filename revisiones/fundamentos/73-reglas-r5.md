# Reglas comunes, ronda 5

Plan aprobado: 72-plan-r5.md (aplica TODO lo de tu página). Textos y citas exactos (mandan en datos; úsalos tal cual): 64-experto-r5.md (motor Spark), 65-observabilidad-r5.md (Spark UI, query profile), 66-plataforma-r5.md (Photon, compute, DBR). Pedagogía y estructura: 62-pedagogo-r5.md, 63-editor-r5.md. Lector: 61-junior-r5.md. Todos en este mismo directorio hub/.

Decisiones del usuario:
- D1: Plan de ejecución queda con 3 predicciones (P1 actual + bhj + aggsort nueva de 62 "Preguntas propuestas" 1). narrow, agg y smj pasan a ejemplos resueltos. P2 actual ("de 4 a 50") sale a "Para seguir explorando".
- D2 (por defecto): stages P1 se sustituye por la pregunta 3 de 62 ("¿Cuándo empieza la task 17?", respuesta c); P3 se reordena con la correcta en a. Respuestas de la página: c, b, a.
- D3: repaso R8 pasa a la versión INNER de 62 pregunta 2 (respuesta b).
- D4: las dos cajas "Verifícalo" de joins se sustituyen por un párrafo (63 §4) + frase en Fuentes.
- D5: repaso cambia los números: stages 12–21 y jobs 5–14, stage lento 20 y su job 13, premisa "el compute ya había corrido otras celdas". En html y js, de forma coherente.
- D6 (por defecto): Spark Connect y compute estándar se quedan en arquitectura pero van al final de "En Databricks".
- Repaso añade la pregunta 4 de 62 ("¿Qué es cada Job N?"); el repaso es la excepción al máximo de 3.

## Ya hecho por el hub (no lo toques)
- glossary.json: Photon (UI vs Clusters/Jobs API, sin "siempre"), SQL warehouse ("Photon es su motor por defecto"), AQE ("queries batch"), job (aviso de job de Lakeflow).
- app.js: veredicto VACÍAS "por defecto en queries batch". El componente de predicción cambió de aspecto (letra como tecla, comentario bajo la opción elegida); el marcado HTML NO cambia: sigue igual que siempre, con "a) …" al principio de cada botón.
- _data/pages.yml: resumen de joins con cinco estrategias: "Broadcast (hash y nested loop), shuffle hash, sort-merge y producto cartesiano: qué elige Spark, qué cambia AQE y cómo se ve en el plan." Usa este texto en el description de joins.html.
- aqe.html: el li "Dónde AQE no actúa" ya dice batch + streaming sin estado desde DBR 18.0, con fuente. No lo toques (el redactor de plan sí añade el bloque de query stages, ver abajo).
- query-profile.html: ya tiene COVERAGE_PHOTON y la nota de "Execution Details". joins solo enlaza.
- No toques app.js, style.css, glossary.json, _layouts, _data, CLAUDE.md ni páginas ajenas salvo las que nombre tu encargo. No ejecutes jekyll build/serve (hay otros redactores en paralelo). Si necesitas algo compartido, dilo en el informe.

## Anclas nuevas (créalas en tu página o enlaza a ellas)
- arquitectura.html#job-lakeflow (li "Job de Lakeflow vs job de Spark", dueña).
- arquitectura.html#photon ya existe (dueña de Photon: tabla "Qué cambia en lo que ves" y "Cómo saber si tu ejecución usó Photon").
- arquitectura.html#spark-jobs-celda (donde se explica el desplegable Spark Jobs; dueña de "solo documentado en ejecución interactiva").
- plan-ejecucion.html#unidades (nota de MB/MiB).
- plan-ejecucion.html#una-task (li del stage largo de 1 task).
- plan-ejecucion.html#particiones ya existe (dueña de 200 / auto / DBR 19 / cómo ponerlo).
- spark-ui.html#ejecucion-terminada ya existe.

## Anclas que no se pueden cambiar
Ids de simuladores (ar-*, tr-*, dag-*, wv-*, jt-*, wk-*, sw-*, js-*, rf-*, sc-*, qp-*) y: quien-hace-que, photon, spark-connect, serverless, narrow-wide, cuantos-stages, particiones, repartition-coalesce, explain, count-dos-jobs, varios-jobs, skipped, cache, donde-mirar, como-decide, en-runtime, umbrales, estrategias, ejecucion-terminada, modo-acceso.

## Nota común en 5 páginas
La nota "¿Ya tienes un job lento? Empieza por la …" (arquitectura, plan-ejecucion, stages, shuffle, joins) añade al final, igual en todas: "Si es un job programado que ya terminó, antes <a href="spark-ui.html#ejecucion-terminada">abre el Spark UI de esa ejecución</a>."

## Datos sin fuente (no los escribas)
Nombres de nodos de Photon; "las métricas del stage se llaman igual con Photon"; "con Photon el reparto en stages no cambia"; que la salida de una ejecución terminada conserve el desplegable Spark Jobs; fórmula de particiones de lectura de tablas pequeñas.

## Predicciones
Marcado: <div class="guess q" data-guess data-answer="x"> con .guess-cover (pregunta + .guess-opts con <button data-opt>, texto "a) …"), un .guess-fb[data-for] por opción y .guess-body. Criterio: skill pedagogia, "Lo esencial frente a las predicciones". Revisa cada predicción de tu página al terminar: nada antes de la pregunta da su respuesta; opciones de largo parecido, sin absolutos y sin la explicación dentro; cada comentario nombra el error real.

## Informe final (breve)
Cambios por bloque (archivo:línea), qué NO aplicaste y por qué, datos nuevos con URL, cambios necesarios en archivos compartidos.
