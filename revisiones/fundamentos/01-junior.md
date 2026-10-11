# Ronda 1 — Informe de ingeniero-junior sobre Fundamentos

Páginas: arquitectura → plan-ejecucion → stages → shuffle → joins (orden de src/_data/pages.yml). Los simuladores de stages, shuffle y DAG/línea de tiempo de plan-ejecucion viven en src/assets/app.js (líneas ~179-300, 305-379, 382-478, 920-1097), no en assets/js/<slug>.js.

Utilidad: arquitectura 4 · plan-ejecucion 4 · stages 4 · shuffle 4 · joins 5.

## Dónde se perdió (por página)

### arquitectura
- arquitectura.js:17 "`filter` es una transformación narrow": narrow no está en el glosario ni explicado hasta plan-ejecucion.html:26.
- arquitectura.js:19 "solo viajan los conteos parciales, en un shuffle pequeño": shuffle sin enlace.
- arquitectura.html:43 "SparkContext" no definido; SparkSession aparece como punto de entrada en la fila siguiente. ¿Diferencia?
- arquitectura.html:51 "Spark master": no sabe qué es.
- arquitectura.html:88-91 "Los stages y las tasks no cambian por eso [AQE]": choca con plan-ejecucion.html:235, stages.html:66 (AQE une particiones = menos tasks) y joins.html:150-153 (cambia sort-merge por broadcast).
- arquitectura.html:180-182 "protocolo gRPC… planes sin resolver": dos términos nuevos.
- arquitectura.html:173-176 Single node: no sabe dónde mirar si su job es single node.
- Le falta: cómo ver en Spark UI que el driver está saturado; si `display()` se comporta como show() o collect().

### plan-ejecucion
- :34 "Las agregaciones (`groupBy`, `count()`)": mezcla count() acción (añade stage de 1 task) con groupBy().count() (no lo añade). Falló una predicción por esto y la página no explica por qué.
- :69-71 y :334-336: la razón de varios jobs por acción está en aqe.html#una-accion-dos-jobs (página 10). Se necesita ya.
- :335 "cada query stage se lanza aparte": query stage no definido ni en glosario.
- app.js:312 "80 tasks con 32 cores son 3 waves": waves antes de stages.html, sin enlace.
- app.js:317/319 "80 tasks · map" / "200 tasks · reduce": map/reduce no se explica hasta shuffle.html:86-106.
- app.js:311 "80 tasks (una por archivo de ~128 MB)" parece contradecir plan-ejecucion.html:243 "no hace una partición por archivo".
- app.js:372 "cada punto un RDD": RDD no se explica.
- app.js:371 "Details for Job 3" vs etiqueta "Job 1 · la acción write"; el árbol numera desde Job 0/Stage 0 y el DAG desde Stage 1.
- :165 errata "Con lo que haz logrado aprender" (has).
- :286 "con Photon": ¿cómo cambia nombres?
- Le falta: por qué una acción da varios jobs; cómo encontrar el stage lento ("si tienes un job lento, sigue por…").

### stages
- :17-18 y :237-238 "usa `auto` si el shuffle es alto": no dice cómo se pone, qué es "alto" ni cómo combina con la regla del múltiplo de cores.
- :30-31 "de 200 a 201 y un stage tarda casi el doble": solo con 200 cores; no se dice ahí (se entiende en :235).
- :66 y :168 "AQE une particiones": sin enlace a aqe; ¿entonces el múltiplo da igual?
- :166 "La guía de skew habla de esa cola larga": ¿qué guía? sin enlace.
- :186-187 "antes de una UDF lenta… (Databricks, slow stage low I/O)": UDF no definida; fuente sin enlace ni en Fuentes.
- :172-176 no dice dónde se ven los cores totales.
- :175 "query insights" no está en el glosario (sí "performance insights").
- "Prueba esto" (:106-107, :160-161) da la respuesta antes de probar.
- Le falta: dónde ve los cores; cómo combinar "múltiplo de cores", "128-200 MB por task" (shuffle.html:254) y `auto`.

### shuffle
- :162 "Por eso `max` no sufría en el lab y la ventana sí": lab es página 13, sin enlace.
- :19-20 y :218 "ventanas con partitionBy": no explica por qué no tienen agregación parcial.
- :185 "Max frente a p75": p75 no definido; umbral 1.5× solo en otro simulador.
- :227 "las *ByKey* (salvo contar)": jerga RDD.
- :236-238 "Shuffle write vs Output": Output aparece por primera vez.
- :22-23 y :251-252 recomendación `auto` dos veces, sin decir qué hace.
- :225-232 coalesce/repartition(1) casi idéntico a plan-ejecucion.html:263-275, sin enlace.
- :202-205 "No confirmé en la doc qué nombre exacto… Verifícalo": le deja sin saber qué mirar en serverless.
- :160-168 "Prueba esto" da las respuestas.
- Le falta: qué cifra de shuffle es "alta"; métricas en serverless.

### joins
- :48-50 "En el examen aparece en la sección 3…": ¿qué examen? se aclara en casos.html:15.
- :91 LEFT SEMI / LEFT ANTI y :74 CROSS no definidos.
- :68-69 "Shuffle y sort caros, pero el sort puede hacer spill": "pero" sin sentido.
- :122 estadísticas: de dónde salen; ANALYZE TABLE (:358, :411) sin enlace a mantenimiento-delta.
- :353 "Hecho" y "dimensión" no explicados.
- :255-259, :329 muchos términos de plataforma juntos (SQL warehouses, Databricks SQL, Performance insights, HISTORY_BASED_JOIN_STRATEGY).
- :340-342 bin size con percentiles: no sabría calcularlo.
- :375 Photon "always selects the best join type": ¿con Photon nada aplica?
- :101-106 y :136-140 cajas "Verifícalo" (regla sale del código de Spark): no sabe si fiarse.
- Le falta: tamaño real de la dimensión en memoria antes de broadcast; qué cambia con Photon.

## Repeticiones entre páginas (concepto — dónde — ¿ayudó? — dueña según el junior)
- Una task por partición — arq:56-57,75-76,159; plan:45-46,74,218,225-226; stages:12,38-39,64 — repaso útil — plan-ejecucion
- Lazy / acción lanza job — arq:20-21,154-155; plan:17-22,346-348 — útil una vez; definición de 346-348 llega tarde — plan-ejecucion
- Un executor por worker — arq:16-17,54-55,68-69,193-195 (4 veces); stages:40-42,221-223 — sobró — arquitectura (una vez)
- Scheduler — arq:18-19,47-48; stages:12-13 — ayudó — arquitectura
- Cada core toma la siguiente sin esperar — arq:81-85; stages:67-68,108-110 — ayudó (lo entendió en stages) — stages
- El stage siguiente espera a todas — arq:86-87; plan:215-217; stages:55-57; shuffle:118-119 — repaso útil — plan-ejecucion
- 128 MB por partición — arq:76-77; plan:231,243-253; stages:64-65; shuffle:59,96-97 — útil; app.js:311 lo contradice en apariencia — plan-ejecucion
- "tantas particiones como cores" — arq:77-79; plan:244-250 — sobró en arquitectura — plan-ejecucion
- Exchange = frontera de stage — plan:31-33,214,297; shuffle:17-18,118-121 — útil — plan-ejecucion
- Qué es un shuffle — plan:30-31; shuffle:12-13,45-47 (dos veces) — bien — shuffle
- Agregación parcial — plan:34-39,291; shuffle:130-136,160-164 — ayudó — shuffle (plan debe enlazar)
- count() añade stage de 1 task — arq js:19, arq:87; plan:96-99,153-155,310-312 — útil, pero nunca se distingue de groupBy().count() — plan-ejecucion
- Broadcast evita shuffle de la grande — plan:301-304; app.js:336; shuffle:21,216-217,258-259 (misma frase dos veces); joins:14-15,45-47,61-63 — sobró en shuffle — joins
- coalesce(1) vs repartition(1) — plan:263-275; shuffle:225-232 — casi literal — plan-ejecucion
- 200 por defecto / AQE une — plan:147,235,299-300; stages:65-66; shuffle:98,167-168 — repaso — plan-ejecucion
- `auto` para shuffle alto — stages:17-18,237-238; shuffle:22-23,251-252 — sobró: 4 veces y ninguna explica — una sola dueña con explicación
- AQE da varios jobs por acción — arq:88-91,156; plan:69-71,144-146,334-336; glosario — 5 veces sin el porqué — plan-ejecucion con porqué corto
- Serverless sin Spark UI — arq:186-188; stages:172-176; shuffle:202-203; joins:261-263; glosario — sobró — arquitectura
- Spill memory vs disk — shuffle:192-195,242-243 — sobró — memoria-oom o shuffle
- Skew: más cores no ayudan — stages:21-22,111-113,164-166,224-227 — repetido — diagnostico
- Sin cache() se recalcula — plan:47,150-152,355-360 — útil — plan-ejecucion
- Regla del LEFT y broadcast — joins:19-21,97-100,222-223,406-408 — 4 veces — joins
- Umbral 10 MB / 30 MB — joins:16-18,125-127,150-157,383-386 — 4 veces — joins

## Enlaces que faltan
arq js:17 narrow→plan; arq js:19 y arq:157 shuffle→shuffle; app.js:312 waves→stages; app.js:317/319 map/reduce→shuffle; app.js:336 broadcast→joins; plan:349-350 "Skipped stages" ↔ shuffle:125-127 "Archivos intermedios"; stages:57 shuffle→shuffle; stages:66,168 AQE→aqe; stages:166 "guía de skew"; stages:187 slow stage low I/O sin enlace ni Fuentes; stages simulador 2 vista Spark UI→spark-ui; shuffle:59,96-97 →plan#particiones; shuffle:162 lab; shuffle:225-232 →plan#particiones en vez de repetir; joins:358,411 ANALYZE TABLE→mantenimiento-delta.

Enlaces que llegan antes de tiempo: plan:71,336 → aqe#una-accion-dos-jobs (molesta: se necesita ya). Los demás "para más detalle" no molestan.

## Orden
- arquitectura usa stage, shuffle, partición, AQE, job y "narrow" antes de plan-ejecucion.
- plan-ejecucion usa waves (stages), map/reduce (shuffle), broadcast/SortMergeJoin/BroadcastExchange (joins), pestañas del Spark UI y AQE antes de sus páginas.
- shuffle usa spill, skew, p75 y "el lab".
- joins usa query profile, performance insights, predictive optimization, ANALYZE, Photon y "el examen".
- Propuesta del junior: arquitectura → plan-ejecucion → shuffle → stages → joins.

## Modelo mental del junior (al terminar la sección)
1. Transformaciones: el driver las anota en un plan; no se lee nada.
2. Acción: el driver toma la cadena, Catalyst optimiza y elige plan físico (joins, Exchange).
3. El scheduler corta en stages en cada Exchange. Una acción = un job, aunque con AQE pueden salir varios. [NO SEGURO: por qué varios jobs]
4. Una task por partición; lectura en trozos de hasta 128 MB; tras shuffle, shuffle.partitions (200, o menos si AQE une). [NO SEGURO del 200: en DBR 19 el defecto podría ser auto]
5. Tasks a cores libres de executors (uno por worker); un core una task; toma la siguiente al terminar; waves si hay más tasks que cores.
6. Shuffle: cada task del stage anterior escribe un archivo con un bloque por destino; las del siguiente leen su bloque de todos. El stage siguiente espera a todas.
7. En esas fronteras AQE conoce tamaños reales: une particiones, cambia sort-merge por broadcast, parte skew. [NO SEGURO de que sea todo]
8. Resultado al driver o al almacenamiento. En serverless el driver está en un servidor remoto y el notebook es cliente. [NO SEGURO qué cambia del dibujo]

## Predicciones fallidas
- arquitectura: count() (no vio el 2.º stage); show() (pensó que leía todo).
- plan-ejecucion: Job 1 reutiliza lo leído (relee); groupBy().count() con stage extra (no, y la página no explica por qué); join broadcast sin job aparte (sí lo hay); count() antes de write es barato (no).
- stages: task lenta al inicio vs al final; 256 tasks con 4 cores más rápido (es más lento); 16 workers con 200 tasks bien (con 13 igual y más barato).
- shuffle: 4 archivos por map task (1 archivo con bloques); pocas particiones = solo lento (es spill).
- joins: rango tablas grandes = Cartesian (en LEFT es BNLJ forzado); 10×10 por clave = explota (muchos a muchos, 5×); OR sin problema (nested loop); AQE cambia aunque haya MERGE (lo respeta).
- Patrón: el bloque tapado de plan-ejecucion ("Ya lo pensé: mostrar el Spark UI") le obligó a predecir y es donde más aprendió. Los "Prueba esto" de stages:106-107,160-161, shuffle:160-168 y joins:215-217 dan la respuesta antes.

## Hueco de toda la sección
Ninguna página dice "si ya tienes un job lento, empieza por aquí". Pondría una línea al final de cada página que lleve a spark-ui.html y diagnostico.html.

## Lo que buscó fuera (sin decidir quién tiene razón)
- `spark.sql.shuffle.partitions = auto`: doc AQE Databricks "Setting the value `auto` enables auto-optimized shuffle, which automatically determines this number" (Default 200) https://docs.databricks.com/aws/en/optimizations/aqe . Notas DBR 19 (21-sep-2026, Spark 4.2.0): "Auto-optimized shuffle v2 is now used when you do not set a fixed number of shuffle partitions. Workloads that explicitly set a fixed shuffle partition count are unchanged." https://docs.databricks.com/aws/en/release-notes/runtime/19 . POSIBLE CHOQUE con "el valor por defecto real es 200" (plan:147,235-237,299-300; stages:65-66; shuffle:98).
- groupBy().count(): PySpark GroupedData.count "Counts the number of records for each group" devuelve DataFrame; DataFrame.count devuelve "the number of rows in this DataFrame". Debería decirse junto a plan:34.
- query stage: doc AQE "shuffle and broadcast exchange (referred to as a query stage in AQE)". No explica por qué salen varios jobs.
- Serverless: seis propiedades fijables, shuffle.partitions entre ellas, autoBroadcastJoinThreshold no (https://docs.databricks.com/aws/en/spark/conf). En serverless sí se puede poner auto, la sección no lo dice.
- LEFT SEMI/ANTI/CROSS: https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-qry-select-join
