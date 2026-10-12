# Plan consolidado — Fundamentos (ronda 1: junior → pedagogo + editor + experto-motor-spark)

Decisiones del hub:
- Orden del menú: SE MANTIENE (arquitectura → plan-ejecucion → stages → shuffle → joins). Pedagogo y editor coinciden: el cambio del junior no quita las dependencias reales y separa shuffle de joins. Las dependencias se resuelven con enlaces y quitando "map/reduce" y "waves" sin enlace del simulador DAG.
- Cada concepto tiene UNA página dueña (tabla abajo). En las demás, recordatorio de una línea + enlace.
- Datos: solo los verificados por experto-motor-spark (citas en "Fase 1"). Lo marcado "sin fuente" se redacta como observado ("suele verse") o se quita.
- Citas descargadas por el experto: scratchpad/motor/*.txt

## Mapa de dueños
| Concepto | Dueña | Recordatorio + enlace en |
|---|---|---|
| Task = una partición; origen de particiones (128 MB, minPartitionNum, default shuffle/`auto`, repartition/coalesce) | plan-ejecucion#particiones | arquitectura (solo "16; de dónde sale: enlace"), stages, shuffle |
| Lazy / acción / job; narrow/wide | plan-ejecucion (cuerpo, #narrow-wide) | arquitectura (simulador) |
| Varios jobs por acción (porqué corto) + query stage | plan-ejecucion#varios-jobs | arquitectura, glosario; ejemplo en aqe#una-accion-dos-jobs |
| Un executor por worker | arquitectura (tabla + "Con qué se confunde") | stages (una celda) |
| Cores/waves; cada core toma la siguiente | stages (#waves) | arquitectura (simulador), glosario |
| Stage siguiente espera a todas | regla en plan-ejecucion; porqué en shuffle | se quedan las menciones (cada una sirve a su página) |
| Shuffle write/read, map/reduce task | shuffle (#map-reduce) | plan ("escribe / lee el shuffle") |
| Agregación parcial | shuffle (#agregacion-parcial) | plan:34-39 con enlace |
| count() acción vs groupBy().count() | plan-ejecucion (caja) | arquitectura.js enlaza |
| Broadcast / joins / Photon | joins (#como-decide) | plan, shuffle (una fila) |
| AQE (une particiones, cambia join, skew) | aqe.html (#otras-funciones) | plan, stages, shuffle, joins enlazan |
| `auto` (qué hace, cómo se pone, default por compute) | plan-ejecucion#particiones (dato) + remedios#auto (cuándo usarlo) | stages, shuffle: una línea |
| Serverless sin Spark UI | arquitectura#serverless | cierres "Dónde mirar" |
| Spill | memoria-oom / diagnostico | shuffle (tabla de métricas) |
| Skew | diagnostico | stages (una mención con enlace) |

## Fase 1 — Datos y contradicciones (verificado por experto-motor-spark)
1. Default `spark.sql.shuffle.partitions` (impreciso hoy): 200 en Apache Spark y clásico DBR ≤ 18; `auto` en serverless; DBR 19+ sin número fijo → auto-optimized shuffle v2. Textos listos:
   - plan-ejecucion.html:235 celda: «Depende del compute: 200 en Apache Spark y en clusters clásicos con Databricks Runtime 18 o anterior. En serverless el valor por defecto es `auto`, y desde Databricks Runtime 19 se usa auto-optimized shuffle si no fijas un número. AQE puede unir las particiones pequeñas.» + enlaces spark/conf#serverless y release-notes/runtime/19 (con par Azure).
   - Párrafo nuevo bajo la tabla: «**`auto`.** Con `spark.sql.shuffle.partitions = auto`, Databricks decide cuántas particiones tiene cada shuffle según el plan y el tamaño de la entrada (*auto-optimized shuffle*). Se fija como cualquier conf: `spark.conf.set("spark.sql.shuffle.partitions", "auto")` o `SET spark.sql.shuffle.partitions = auto`. Es el valor por defecto en serverless. En Databricks Runtime 19 o superior se usa siempre que no fijes un número. Si fijas uno (por ejemplo 200), Databricks lo respeta. Las reglas de "múltiplo de los cores" y "128–200 MB por task" son para cuando fijas el número a mano.»
   - plan:144-147 nota; plan:299-300; plan-ejecucion.js:170; stages:65-66; shuffle:97-98; stages:17-18; aqe.html:188-190 celda Default; simuladores app.js (línea en consola «Supone `shuffle.partitions = 200` (default de Spark y de DBR ≤ 18 clásico).») — textos en el informe del experto (resumidos arriba; mismo criterio).
   - Fuentes: docs.databricks.com/aws/en/optimizations/aqe, /spark/conf#serverless, /release-notes/runtime/19#2026-09-21-features, /optimizations/spark-ui-guide/long-spark-stage-io#high-shuffle, cada una con par Azure.
2. arquitectura.html:88-91 (falso como absoluto): «**El simulador cuenta stages y tasks, no jobs.** Cuántos jobs ves en el Spark UI por una acción depende de AQE, que viene activo en Databricks, y de la acción: por eso las cifras dicen «1 o más» (ver <a href="plan-ejecucion.html#varios-jobs">por qué</a>). Repartir la acción en varios jobs no añade trabajo. Lo que AQE sí puede cambiar, en queries con shuffle, es el número de tasks de los stages que leen ese shuffle y el tipo de join; el simulador no lo modela (ver <a href="aqe.html">AQE</a>).»
3. plan-ejecucion.html:34 count vs groupBy().count() (impreciso): «Las agregaciones empiezan antes del shuffle: cada partición calcula un resultado parcial, como la suma o el conteo de cada clave. Después del shuffle, Spark junta esos parciales. Ojo con los dos `count`. `df.groupBy("k").count()` es una transformación: cuenta por grupo y devuelve un DataFrame; sus resultados se reparten en las particiones del shuffle, una task por partición. `df.count()` es una acción: devuelve un solo número. Como no hay claves, todos los conteos parciales acaban en una sola partición, y el último stage tiene 1 task (lo verás en el Spark UI).» Fuentes PySpark GroupedData.count, DataFrame.count, groupBy.
4. app.js:311 → «80 tasks (la tabla se lee en 80 trozos de hasta 128 MB)»; plan-ejecucion.html:168 título → «ventas: 10 GB, leída en 80 particiones de ~128 MB».
5. app.js:371 "Details for Job 3" → "Details for Job 1"; pie del DAG: «Los números de job y stage son de ejemplo.» app.js:372 "cada punto un RDD" → "los puntos son pasos internos que puedes ignorar". app.js:317/319 quitar "· map"/"· reduce". app.js:312 "3 waves" con enlace a stages.html#waves. app.js:336 "la forma más barata de evitar un shuffle" → "Cuándo puede elegirlo Spark: Joins (#como-decide)".
6. stages.html:30-31 → «O, con 200 cores, cambias `shuffle.partitions` de 200 a 201 y un stage tarda casi el doble (si AQE no une esas particiones).»
7. stages.html:186-187 UDF → «**Una UDF lenta** (una función tuya en Python que Spark ejecuta fila a fila): primero intenta reescribirla con funciones nativas. Si no puedes y el stage tiene menos tasks que cores, haz `repartition()` antes de la UDF para usar todos los cores (Databricks · Slow Spark stage with little I/O + Azure).» URL …/spark-ui-guide/slow-spark-stage-low-io#slow-udfs. Añadir a Fuentes.
8. stages.html:166 skew → «Es la firma del skew: "one or just a few tasks take much longer than the rest" (Databricks · Skew and spill + Azure)» URL …/spark-ui-guide/long-spark-stage-page#skew. Añadir a Fuentes.
9. joins.html:375 Photon: caja en "Cómo decide Spark": «**Con Photon** (siempre en serverless y SQL warehouses; por defecto en clásico si creas el compute desde la UI), el plan lo sigue haciendo el optimizador de Spark, así que el umbral de broadcast y AQE siguen aplicando. Photon cambia la ejecución: sustituye el sort-merge por hash joins propios, así que en serverless es normal no ver `SortMergeJoin`. Si una operación no la soporta (por ejemplo, una UDF), esa parte vuelve al motor de Spark.» (NO afirmar que los hints aplican: inferencia sin fuente). Fuente compute/photon + transform/optimize-joins, con par Azure.
10. plan-ejecucion.html:334-336 (#varios-jobs): «**Job vs acción.** Una acción da una query (la ves en la pestaña SQL / DataFrame) y, en principio, un job. Con AQE, Spark ejecuta la query por tramos: cada tramo que acaba en un shuffle o un broadcast es una **query stage**. Al terminar una, AQE conoce los tamaños reales y puede cambiar lo que falta del plan. En el Spark UI esos tramos suelen salir como jobs distintos de la misma query. Ejemplo con un `count()` en AQE.» plan:69-71: «Cada acción. Con AQE puede verse como varios jobs, porque ejecuta la query por tramos (ver *Con qué se confunde*).» Glosario nuevo: query stage.
11. display() (arquitectura, sección del resultado): «**`display()` está entre `show()` y `collect()`.** `show()` imprime 20 filas por defecto. `display(df)` muestra una tabla de hasta 10.000 filas o 2 MB (lo que se alcance antes) y avisa cuando trunca. `collect()` trae **todas** las filas a la memoria del driver.» Fuente notebooks/notebook-limitations#notebook-cell-outputs + Azure.
12. joins.html:101-106 caja Verifícalo → «La doc confirma la regla general: Spark elige el lado que se copia "based on the join type and the sizes of the relations", y una estrategia "might not support all join types" (Hints, Databricks + Azure). El caso del `LEFT OUTER` está en la FAQ de AQE. La tabla completa por tipo de join sale del código de Spark; compruébala con `df.explain()`.» :136-140 se queda.
13. shuffle.html:202-205 → «En serverless (Free Edition) no hay Spark UI; se usa el query profile. Su doc no lista las métricas de shuffle por operador. Por query sí las tienes: `shuffle_read_bytes` y `spilled_local_bytes` en `system.query.history`.» Fuente admin/system-tables/query-history + Azure.
14. Definiciones: LEFT SEMI «filas de la izquierda que tienen pareja a la derecha»; LEFT ANTI «las que no tienen pareja»; CROSS «producto cartesiano: cada fila con todas las del otro lado» (sql-ref-syntax-qry-select-join#parameters + Azure). SparkContext: quitar de arquitectura:43 («El proceso que ejecuta tu programa y coordina a los executors»). Spark master: «el proceso del driver que coordina a los executors».
15. Erratas: plan:165 → «Elige una query y, antes de destapar el resultado, piensa en cuántos stages tendrá y cuántas tasks cada uno.» joins:68-69 → «Shuffle y sort caros. Si una partición no cabe en memoria, el sort hace spill a disco.» (sin "en lugar de fallar": sin fuente).
16. Hueco "qué shuffle es alto": regla de Databricks "each core can read and write about 3 MBs per second…" (long-spark-stage-io + Azure) → va en remedios#auto o donde se use "shuffle alto".

## Fase 2 — Deduplicación, enlaces, términos, títulos, orden interno (editor-tecnico)
Anclas a crear: arquitectura#quien-hace-que (h3 :38), arquitectura#serverless (li :186), plan#narrow-wide (:214), plan#repartition-coalesce (:263), plan#varios-jobs (:334), stages#waves (h3 :116), stages#cuantas-tasks (h3 :182), shuffle#map-reduce, shuffle#archivos-intermedios (:125), shuffle#agregacion-parcial (h3 :129), shuffle#metricas (h3 :171), joins#como-decide (h3 :121), aqe#otras-funciones (h3 :107), remedios#auto (h3 :47), diagnostico#summary-metrics (h3 :91), spark-ui#ruta-diagnostico (h3 :197), mantenimiento-delta#estadisticas (h3 :246).

Deduplicación:
- D1 executor por worker: quitar arq:68-69 "Databricks corre un executor por worker, así que"; quitar filas Executor y Task de stages:38-42 y fusionar :50-51 en «Task, executor y worker están en Quién hace qué (arquitectura#quien-hace-que); job y stage, en Plan de ejecución.»; stages:221-223 → «**Workers vs cores.** Para las waves cuentan los cores totales de los executors, no el número de workers.»
- D2 particiones: arq:76-80 → «De dónde sale ese 16: De dónde sale cada partición (plan#particiones). En otras páginas, `ventas` tiene otros tamaños.»; stages:64-66 → «**Cada stage tiene una task por partición** (de dónde salen: Plan de ejecución)»; shuffle:58-60 quitar "(una por cada trozo de entrada, ~128 MB)"; shuffle:96-97 enlazar plan#particiones.
- D3 "stage siguiente espera": no tocar.
- D4 agregación parcial: plan:34-39 añadir «(cuánto ahorra: Shuffle#agregacion-parcial)».
- D5 broadcast: quitar shuffle:258-259; shuffle:216-217 «(ver Joins#como-decide)»; app.js:336 (Fase 1.5).
- D6 coalesce/repartition: quitar shuffle:230-232; dejar «Qué implica eso para `coalesce(1)` frente a `repartition(1)`: Plan de ejecución#repartition-coalesce.»
- D7 200/AQE une: ver Fase 1.1; "AQE une" en plan:235, stages:168, shuffle:168 → enlace aqe#otras-funciones.
- D8 auto: stages:17-18 (texto Fase 1.1) con enlace remedios#auto; quitar stages:237-238; shuffle:22-23 enlace; fusionar shuffle:251-254 «**Pocas particiones para mucho shuffle:** cada reduce task lee demasiado y aparece spill. Usa `auto` o apunta a 128–200 MB por task (ver Remedios#auto).»
- D9 varios jobs: arq:156 «**La acción crea un job (en el Spark UI pueden salir varios; ver por qué).**» → plan#varios-jobs; plan:69-71, :144-146 enlazan #varios-jobs.
- D10 serverless: stages:172-180 caja → «En serverless (Free Edition) no eliges los cores ni hay Spark UI (ver Arquitectura#serverless), así que las waves no se ven. En un cluster clásico: Spark UI → stage → **Event Timeline**.» (quita "query insights" y enlaces Azure sin par); shuffle:202-205 (Fase 1.13).
- D11 spill: quitar shuffle:242-243.
- D12 def shuffle duplicada: shuffle:12-13 → «Un shuffle redistribuye las filas entre particiones según una clave. Es caro: disco, serialización y red.»
- D13 skew: quitar stages:165-166 frase sin enlace (o sustituir por Fase 1.8).
- D14 regla LEFT: quitar joins:406-408; su dato pasa a :222-223 «Spark ignora el hint, lo registra en el log del driver y sigue con su elección.»
- D15 umbrales: joins:383-386 → «**Umbral estático vs umbral de AQE.** Son dos configs distintas (ver Cómo decide Spark). Ninguna vale 100 MB por defecto, aunque algunos tutoriales lo digan.»

Enlaces que faltan: arquitectura.js:19 "shuffle pequeño"→shuffle.html; arq:157 "por cada shuffle"→shuffle.html; plan:349-350 "Skipped stages"→shuffle#archivos-intermedios y aqe#una-accion-dos-jobs; stages:57 "el shuffle"→shuffle.html; stages:117/:174 → spark-ui.html; shuffle:162 "el lab"→lab.html; shuffle:185 "Max frente a p75" → definir «percentil 75 (columna *75th percentile* de Summary Metrics)» + diagnostico#summary-metrics; shuffle:202 → query-profile.html; joins:48 "el examen" → «el examen Data Engineer Professional (ver Casos)»; joins:122, :358, :411 "estadísticas"/"ANALYZE TABLE" → mantenimiento-delta#estadisticas; joins:150 "En runtime, AQE" → aqe#otras-funciones; joins:259 "Performance insights" → query-profile.html.

Términos: arquitectura.js:17 quitar "narrow" («`filter` es una transformación: el driver añade un paso al plan.»); plan:214 (#narrow-wide) definir narrow/wide en el cuerpo: «**El plan se corta en cada `Exchange`.** Las transformaciones *narrow* (`filter`, `select`, `withColumn`) trabajan cada partición por su cuenta y van en el mismo stage. Las *wide* (`groupBy`, `orderBy`, un join sin broadcast) necesitan filas de otras particiones: obligan a un shuffle, que aparece como `Exchange`, y ahí empieza otro stage.»; tabla :62 fila «Transformación / Acción»; reducir :346-348. gRPC: quitar («Es un protocolo cliente-servidor: …»); "planes sin resolver" → «planes sin analizar (Spark aún no ha comprobado que existan las tablas y columnas)». *ByKey (shuffle:227) → «…las de reparticionado, las agregaciones por clave y los joins (guía de RDD; el mecanismo es el mismo para DataFrames)». Output (shuffle:236) → «Output (la columna del Spark UI con los bytes que el stage escribe en el almacenamiento)». hecho/dimensión (joins:228, :353-354, :409) → «tabla pequeña (como `clientes`)» / «tabla grande (como `ventas`)». UDF: definida en Fase 1.7. query insights: quitado en D10.
Glosario nuevo: narrow, wide, query stage, UDF, (map task, reduce task opcional).

Títulos: stages:74 → «Cada core toma la siguiente task en cuanto queda libre»; stages:116 → «Cuánto dura un stage según tasks y cores»; stages:182 → «Cuántas tasks pedir según los cores»; shuffle:86 → «Map tasks y reduce tasks: las dos mitades del shuffle»; shuffle:108 → «Qué escribe el lado map y qué lee el lado reduce»; shuffle:171 → «Qué métricas del Spark UI miden el shuffle»; joins:349 → «Qué estrategia elegir en cada situación»; h3 nuevo para el simulador de shuffle:56 → «Un shuffle paso a paso: quién escribe y quién lee».

Orden interno:
- stages: "Cuántas tasks pedir según los cores" (#cuantas-tasks) después del Simulador 3; "Dónde verlo" después.
- shuffle: "Cuándo hay shuffle y cuándo no" sube tras la definición; tabla M/R (:89-102) antes del console del simulador paso a paso; pie :58-62 a una línea.
- joins: tabla de build side + regla LEFT + verify (:78-106) al principio de "Cómo decide Spark"; "Definición corta" solo con def + tabla de estrategias.
- IDs de simuladores no cambian.

## Fase 3 — Enseñanza (pedagogo)
- Patrón "Predice y comprueba": reutilizar la vista tapada `.guess` de plan-ejecucion moviendo CSS a style.css y JS a app.js genérico sobre `[data-guess]`. Máx. 3 por página, antes del simulador; cada distractor nombra el modelo roto; la respuesta explica "Si elegiste X, suponías Y; falla porque Z". Preguntas ya redactadas por el pedagogo para las 5 páginas (count/show/toPandas en arquitectura; Job 1 relee, shuffle.partitions 4→50 en plan; barrera, 32 vs 33, 64 vs 256, 13 vs 16 workers en stages; archivos por map task, spill en shuffle; LEFT/FULL/MERGE/exploding en joins).
- DAG de plan-ejecucion: pregunta por query en vez de genérica; meter plan:204-207 dentro de la vista tapada.
- Autoevaluación de sección (5 preguntas) al final de joins.
- Cierre "Dónde mirar · En tu job" en las 5 páginas (síntoma → dónde → página) + entrada alternativa al principio de arquitectura: «¿Ya tienes un job lento? Empieza por la ruta de diagnóstico del Spark UI (spark-ui#ruta-diagnostico) y vuelve aquí cuando un término no encaje.»
- shuffle: tabla M/R antes del simulador (pre-entrenamiento, coincide con Fase 2).
- arquitectura: cifras "stages: 2 · tasks: 16 + 1"; ar-info al final, no al principio; (autoplay: PENDIENTE de decisión del usuario).
- Opcional: mover el timeline jt-* de plan-ejecucion a stages ("Varios stages en el tiempo").
- Creencia de fondo "más máquinas = más rápido": nombrarla igual en arquitectura, stages y joins ("Más workers no ayudan cuando…").

## Fase 4 — Ronda 2 del junior sobre las 5 páginas; iterar.
