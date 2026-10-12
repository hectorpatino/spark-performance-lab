## Informe experto-motor-spark: Fundamentos, ronda 5

Revisé estos archivos, todos bajo /Users/hrpr/Documents/rote/spark-performance-lab/src/: arquitectura.html, plan-ejecucion.html, stages.html, shuffle.html, joins.html, repaso-fundamentos.html, assets/app.js (simuladores de stages y shuffle), assets/js/{arquitectura,plan-ejecucion,joins,repaso-fundamentos}.js y las entradas de assets/glossary.json que usan esas páginas. Leí las páginas de documentación el 2026-10-11. No ejecuté nada y no edité ningún archivo.

No encontré ninguna afirmación **falsa**. Hay un **impreciso** con un absoluto que contradice otra página de Databricks (el n.º 1, sobre AQE en streaming), varios imprecisos por falta de condición y dos datos sin fuente.

---

### Veredictos

#### Imprecisos (prioridad alta)

**1. "AQE solo actúa en queries que no son streaming" es demasiado absoluto.**
- Afirmación: aparece en src/plan-ejecucion.html:502-503, src/shuffle.html:17-19, src/shuffle.html:205-206, src/joins.html:224, src/assets/glossary.json:90 (entrada AQE, "Actúa en queries que no son streaming") y src/assets/app.js:314 ("por defecto, salvo en streaming").
- Veredicto: **impreciso**.
- Cita 1, página de AQE: "AQE applies to all queries that are: Non-streaming" — https://docs.databricks.com/aws/en/optimizations/aqe#application · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe#application
- Cita 2, otra página de Databricks: "This page describes optimization features available for stateless streaming queries in Databricks Runtime 18.0 and above." / "Databricks supports Adaptive Query Execution (AQE) and Auto Optimized Shuffle (AOS) for stateless streaming queries." / "To enable AQE for stateless streaming queries, set the following configuration to true. This is enabled by default: spark.sql.adaptive.streaming.stateless.enabled true" — https://docs.databricks.com/aws/en/structured-streaming/stateless-streaming#adaptive-query-execution-and-auto-optimized-shuffle · par Azure: https://learn.microsoft.com/azure/databricks/structured-streaming/stateless-streaming
- Alcance: DBR 18.0 y superior, streaming sin estado.
- Corrección: en Fundamentos basta con "en queries batch" y un enlace a AQE, por ejemplo: "AQE actúa en queries batch con al menos un exchange o una subquery (en streaming, ver AQE)". La excepción va una sola vez en aqe.html: "Desde DBR 18.0 también actúa, activado por defecto, en queries de streaming sin estado". aqe.html:99 dice lo mismo que hoy y hay que corregirla igual.
- Nota: app.js:754 y 759 (el caso de streaming con estado) siguen siendo correctos para ese caso. Aun así, "AQE solo se aplica a queries que no son streaming" debería quedar como "a queries de streaming con estado no se aplica".

**2. Las particiones de shuffle "que elija Databricks" no llevan condición.**
- Afirmación: "tantas como `spark.sql.shuffle.partitions`, o las que elija Databricks si no fijas un número" (src/shuffle.html:105-107).
- Veredicto: **impreciso**. Sí hace falta la condición. En compute clásico con una versión anterior a la actualización de DBR 19 del 21-sep-2026, no fijar nada da 200.
- Cita, página de AQE: "Default value: 200" — https://docs.databricks.com/aws/en/optimizations/aqe#enable-auto-optimized-shuffle · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe#enable-auto-optimized-shuffle
- Cita, notas de DBR 19: "Auto-optimized shuffle v2 is now used when you do not set a fixed number of shuffle partitions." — https://docs.databricks.com/aws/en/release-notes/runtime/19#2026-09-21-features · par Azure: https://learn.microsoft.com/azure/databricks/release-notes/runtime/19#2026-09-21-features
- Cita, serverless: tabla con "spark.sql.shuffle.partitions | auto" — https://docs.databricks.com/aws/en/spark/conf#configure-spark-properties-for-serverless-notebooks-and-jobs · par Azure: https://learn.microsoft.com/azure/databricks/spark/conf#configure-spark-properties-for-serverless-notebooks-and-jobs
- Corrección: "tantas como `spark.sql.shuffle.partitions` (200 si no lo cambias). En serverless, y en DBR 19 si no fijas un número, las elige *auto-optimized shuffle* (ver Plan de ejecución)".

**3. "`auto`… es el valor por defecto … desde DBR 19".**
- Afirmación: "Es el valor por defecto en serverless y, desde Databricks Runtime 19, si no fijas uno" (src/stages.html:348-350).
- Veredicto: **impreciso**. Las notas de DBR 19 no dicen que el valor por defecto de la conf pase a ser `auto`. Dicen que se usa "auto-optimized shuffle v2" si no fijas un número. Además, el cambio llegó en una actualización con fecha y los clusters solo la reciben al reiniciar.
- Cita: "Auto-optimized shuffle v2 is now used when you do not set a fixed number of shuffle partitions. Workloads that explicitly set a fixed shuffle partition count are unchanged." y "Clusters receive updates when they restart." — https://docs.databricks.com/aws/en/release-notes/runtime/19#2026-09-21-features · par Azure: https://learn.microsoft.com/azure/databricks/release-notes/runtime/19#2026-09-21-features
- Alcance: DBR 19, actualización del 21 de septiembre de 2026, en compute clásico.
- Corrección: "En serverless, `auto` es el valor por defecto. En compute clásico con DBR 19 (desde la actualización del 21 de septiembre de 2026), si no fijas un número se usa auto-optimized shuffle v2 (ver De dónde sale cada partición)".

**4. A plan-ejecucion.html le faltan la fecha y la versión v2, y mezcla v2 con `auto`.**
- Afirmación: "Desde Databricks Runtime 19, si no fijas un número, se usa auto-optimized shuffle: Databricks elige el número de cada shuffle según el plan y el tamaño de la entrada" (src/plan-ejecucion.html:313-316).
- Veredicto: **impreciso** (menor).
- La frase "según el plan y el tamaño de la entrada" sale de la página de AQE y describe `auto`: "Setting the value auto enables auto-optimized shuffle, which automatically determines this number based on the query plan and the query input data size" — https://docs.databricks.com/aws/en/optimizations/aqe#enable-auto-optimized-shuffle · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe#enable-auto-optimized-shuffle
- Las notas de DBR 19 hablan de la "v2" y no explican qué cambia.
- Corrección: "En DBR 19, desde la actualización del 21 de septiembre de 2026 (los clusters la reciben al reiniciar), si no fijas un número se usa *auto-optimized shuffle v2*. Con `auto`, la doc de AQE dice que Databricks elige el número 'based on the query plan and the query input data size'; las notas no detallan qué cambia la v2".

**5. El glosario de Photon contradice a arquitectura.html (duda 3).**
- Afirmación: "Activo por defecto en el compute clásico y siempre en serverless" (src/assets/glossary.json:141).
- Veredicto: **impreciso**. Omite la excepción de la API. arquitectura.html:229-231 sí la da y está bien.
- Cita: "For classic all-purpose compute, jobs compute, and classic Lakeflow pipelines, Databricks enables Photon by default. Turn it on or off with the Use Photon Acceleration checkbox under Performance when creating or editing compute. … If you create these resources using the Clusters API or Jobs API, you must explicitly enable Photon by setting runtime_engine to PHOTON." — https://docs.databricks.com/aws/en/compute/photon#photon-enablement · par Azure: https://learn.microsoft.com/azure/databricks/compute/photon#photon-enablement (dice lo mismo)
- Alcance: si el job compute se crea con el checkbox de la UI, Photon viene activado. Si se crea con la Jobs API, Photon solo está activo si fijas `runtime_engine = PHOTON`. La doc no dice nada específico de bundles.
- Corrección: "Activo en serverless y en SQL warehouses; por defecto en el compute clásico creado desde la UI. Con la Clusters API o la Jobs API hay que activarlo (`runtime_engine` = `PHOTON`). Catalyst sigue planeando la query."

**6. "La doc de serverless no prohíbe los hints" (duda 7).**
- Afirmación: src/joins.html:29-30 y src/joins.html:491-493.
- Veredicto: **impreciso**. Es literalmente cierto, porque la página de límites de serverless no menciona los hints, pero la doble negación no le dice al lector si funcionan. Sí hay fuente positiva para la API de DataFrame.
- Cita, serverless: "Only Spark Connect APIs are supported. Spark RDD APIs are not supported." — https://docs.databricks.com/aws/en/compute/serverless/limitations · par Azure: https://learn.microsoft.com/azure/databricks/compute/serverless/limitations
- Cita, PySpark: `functions.broadcast` dice "Changed in version 3.4.0: Supports Spark Connect." — https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.broadcast.html. `DataFrame.hint` dice lo mismo — https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.hint.html
- Cita, hints en SQL: la página de Hints dice "Applies to: Databricks SQL Databricks Runtime"; no menciona serverless — https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-qry-select-hints · par Azure: https://learn.microsoft.com/azure/databricks/sql/language-manual/sql-ref-syntax-qry-select-hints
- Corrección (para 29-30): "En serverless no puedes cambiar los umbrales, pero sí puedes pedir broadcast con un hint: `broadcast()` y `.hint()` son APIs de Spark Connect, las que admite serverless." Para 491-493, lo mismo, quitando "no prohíbe".

**7. "Cada `Exchange` abre un stage" (duda 5).**
- Afirmación: título del paso 3 en src/plan-ejecucion.html:238.
- Veredicto: **impreciso**. La misma página dice en 423-426 que `BroadcastExchange` no corta el stage del lado grande, y el glosario (entrada 12, línea 84) distingue los dos casos. El cuerpo del paso habla solo de shuffles, pero el título no lo dice.
- Cita: el Web UI de Spark separa los operadores "BroadcastExchange, ShuffleExchange" (https://spark.apache.org/docs/latest/web-ui.html#sql-metrics). AQE trata los dos como fin de *query stage*: "at the end of a shuffle and broadcast exchange (referred to as a query stage in AQE)" — https://docs.databricks.com/aws/en/optimizations/aqe · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe
- Corrección: "Cada `Exchange` de shuffle abre un stage, y el siguiente espera."
- Además, que el lado copiado "se lee en su propio stage … y ese stage puede salir en otro job" (plan-ejecucion.html:395 y 424-426) **no tiene fuente**: es lo que se observa en el Spark UI. Debería quedar cubierto por la nota que ya existe en 490-494 ("la doc no lo detalla"). Basta con añadir ahí "ni el stage que lee la tabla copiada en un broadcast".

**8. La agregación parcial y la hash se atribuyen a "la doc de Spark".**
- Afirmación: "Con un join o un `groupBy`, Spark calcula con un hash de la clave a qué partición destino va cada fila. … Así lo describe la doc de Spark." (src/shuffle.html:184-188)
- Veredicto: **impreciso**. La guía de RDD describe el archivo único y los bloques, pero no menciona el hash. El hash se ve en el plan.
- Cita, guía de RDD (el mecanismo es el mismo para DataFrames): "results from individual map tasks are kept in memory until they can't fit. Then, these are sorted based on the target partition and written to a single file." — https://spark.apache.org/docs/latest/rdd-programming-guide.html#performance-impact
- Cita, plan: "Exchange hashpartitioning(k#33, 200)" — https://spark.apache.org/docs/latest/sql-ref-syntax-qry-explain.html
- Corrección: "El plan lo muestra como `Exchange hashpartitioning(clave, n)`: un hash de la clave decide la partición destino. Lo demás lo describe la doc de Spark (guía de RDD; el mecanismo es el mismo para DataFrames): los resultados …"

**9. El paralelismo por defecto en single node.**
- Afirmación: "en single node, los cores de la máquina" (src/plan-ejecucion.html:354).
- Veredicto: **impreciso** (menor).
- Cita, Spark: "Local mode: number of cores on the local machine" (`spark.default.parallelism`) — https://spark.apache.org/docs/latest/configuration.html
- Cita, Databricks: un single node "Spawns one executor thread per logical core in the compute resource, minus 1 core for the driver." — https://docs.databricks.com/aws/en/compute/configure#single-node-compute · par Azure: https://learn.microsoft.com/azure/databricks/compute/configure#single-node-compute
- Ninguna de las dos dice qué paralelismo usa Spark en un single node de Databricks.
- Corrección: quitar el inciso, o poner "en single node, depende de los cores de la máquina".

**10. "Spark Jobs" bajo la celda solo está documentado para ejecución interactiva.**
- Afirmación: src/arquitectura.html:337-339 y 344-346, src/plan-ejecucion.html:593-594 y src/repaso-fundamentos.html:625-627.
- Veredicto: **impreciso** (de alcance).
- Cita: "If you're not sure if your code is running Spark, try running it interactively in a notebook. If the code is using Spark, you will see Spark jobs under the cell" — https://docs.databricks.com/aws/en/optimizations/spark-ui-guide/spark-job-gaps#execution-of-non-spark-code · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/spark-ui-guide/spark-job-gaps#execution-of-non-spark-code
- Corrección: "al correr la celda en un notebook interactivo, bajo ella aparecen sus jobs…". La doc no dice si la salida de una ejecución de Lakeflow Jobs muestra ese desplegable. Esto responde a la duda abierta del junior.

#### Sin fuente

**11. "Spark hace trozos de menos de 128 MB para acercarse a ese mínimo" (duda 2).**
- Afirmación: src/plan-ejecucion.html:355-356, frente al simulador del repaso: src/assets/js/repaso-fundamentos.js:27 (Stage 6, 8 MiB en 2 tasks con 32 cores).
- Veredicto: **sin fuente**. La doc no da el algoritmo de corte. Además, la frase induce a esperar unas 32 tasks, que es justo la contradicción que vio el junior.
- Lo que sí dice la doc (https://spark.apache.org/docs/latest/sql-performance-tuning.html#tuning-partitions):
  - `spark.sql.files.maxPartitionBytes`: "The maximum number of bytes to pack into a single partition when reading files."
  - `spark.sql.files.openCostInBytes` (4 MB): "The estimated cost to open a file … This is used when putting multiple files into a partition."
  - `spark.sql.files.minPartitionNum`: "The suggested (not guaranteed) minimum number of split file partitions."
  - La doc de Spark no dice que `openCostInBytes` sea un tamaño mínimo de trozo, aunque el 2 del simulador cuadra con eso.
- Databricks: solo documenta `maxPartitionBytes` (128 MB) entre las confs de serverless (https://docs.databricks.com/aws/en/spark/conf#configure-spark-properties-for-serverless-notebooks-and-jobs). No encontré ninguna página de Databricks o Delta sobre el corte de lectura.
- Corrección propuesta (sin el dato): "Con una tabla pequeña, Spark puede hacer trozos de menos de 128 MB para repartir la lectura entre los cores, pero no hasta tener una task por core: también cuenta el coste estimado de abrir cada archivo (`spark.sql.files.openCostInBytes`, 4 MB). La doc no da la fórmula; el número real de tasks lo ves en el stage que lee la tabla."
- Simulador: deja las 2 tasks. Con el texto nuevo ya no contradicen nada. Si quieres, añade en repaso-fundamentos.html:433-435 "(su lectura sale en 2 tasks; cuántas salen de una tabla pequeña no lo fija la doc)".

**12. El reparto del shuffle con Photon.**
- Afirmación: "El reparto en stages y el reparto all-to-all no cambian; el formato de los archivos sí puede" (src/shuffle.html:196-197).
- Veredicto: **sin fuente**. La doc de Photon solo dice "uses a redesigned columnar shuffle to increase throughput for large-scale joins" — https://docs.databricks.com/aws/en/compute/photon · par Azure: https://learn.microsoft.com/azure/databricks/compute/photon
- Corrección: "Usa su propio shuffle columnar. La doc no detalla cómo son sus archivos ni si cambia algo más."

**13. La espera por localidad no aparece.**
- Afirmación: "Cuando un core queda libre, recibe la siguiente task de la cola, sin esperar a los demás cores" (src/stages.html:142-144).
- Veredicto: **sin fuente directa**. La idea de que no hay barrera es razonable, pero el matiz de localidad no aparece en esta página; sí aparece en repaso E3 (b).
- Cita: `spark.locality.wait` (3s): "How long to wait to launch a data-local task before giving up and launching it on a less-local node." — https://spark.apache.org/docs/latest/configuration.html
- Corrección: añadir "(puede esperar unos segundos para lanzar una task cerca de sus datos: `spark.locality.wait`, 3 s por defecto)".

#### Correctos, con mejora de enlace

**14. Skew en LEFT OUTER (duda 8): correcto.**
- Afirmación: "en un LEFT OUTER, AQE solo parte el skew del lado izquierdo" (src/repaso-fundamentos.html:769-776).
- Veredicto: **correcto**.
- Cita: tabla "LEFT OUTER | Yes | No" y "For example, in a LEFT OUTER JOIN, only skew on the left side can be optimized, and a FULL OUTER JOIN is not skew-optimized on either side." — https://docs.databricks.com/aws/en/optimizations/aqe#why-didnt-aqe-detect-my-data-skew · par Azure: https://learn.microsoft.com/azure/databricks/optimizations/aqe#why-didnt-aqe-detect-my-data-skew (la misma tabla)
- El escenario cuadra: `productos LEFT JOIN con_cliente` tiene el skew a la derecha. La task Max lee 9,1 GiB, por encima de 256 MB y de 5 veces la mediana.
- Mejora: el enlace de la línea 772 apunta a la raíz de la página; cámbialo al ancla `#why-didnt-aqe-detect-my-data-skew`. Según el junior, la explicación también debería vivir en aqe.html; eso es tema de pedagogía.

**15. "Cinco estrategias" (duda 6): correcto.**
- Afirmación: "Cinco estrategias físicas" (src/joins.html:56).
- Veredicto: **correcto**. La doc de Spark nombra cinco algoritmos: "broadcast join (either broadcast hash join or broadcast nested loop join depending on whether there is any equi-join key)" (https://spark.apache.org/docs/latest/sql-performance-tuning.html#join-strategy-hints), más "shuffle sort merge join", "shuffle hash join" y "shuffle-and-replicate nested loop join" (https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-hints.html#join-hints · Databricks: https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-qry-select-hints · par Azure: https://learn.microsoft.com/azure/databricks/sql/language-manual/sql-ref-syntax-qry-select-hints).
- Que el nodo se llame `CartesianProduct` sale del código, y la caja "Verifícalo" ya lo dice.
- src/_data/pages.yml:22 no es falso, porque "nested loop" agrupa dos estrategias, pero no cuadra con el "cinco". Propuesta: "Broadcast (hash y nested loop), shuffle hash, sort-merge y producto cartesiano: …".

**16. URL de Photon (duda 3): no se movió.**
- La canónica es https://docs.databricks.com/aws/en/compute/photon. `/aws/en/runtime/photon` hace un 301 a `/aws/en/clusters/photon` y otro 301 a `/aws/en/compute/photon`.
- En Learn, `/azure/databricks/runtime/photon` responde 200 con canonical a `/azure/databricks/compute/photon`.
- El manual ya usa compute/photon en todas partes, así que no hay que cambiar nada.

#### Correctos (lista corta)
- arquitectura.html:213-225: multinodo, cero workers, single node. Cita: "To run a Spark job, you need at least one worker node…" y "Spawns one executor thread per logical core … minus 1 core for the driver" (compute/configure).
- arquitectura.html:242-243: detach notebooks. Cita: "Since the driver node maintains all of the state information of the notebooks attached…"
- arquitectura.html:226-241: Photon (quién planea, colores naranja/morado, API).
- arquitectura.html:244-279 y glossary RDD (entrada 43): Spark Connect, schema analysis, RDD no soportada en serverless ni en compute estándar ("RDD APIs are not supported", compute/standard-limitations).
- arquitectura.html:202-203: "10,000 rows or 2 MB, whichever is lower".
- arquitectura.js:25: aviso de PySpark sobre collect/toPandas ("should only be used if the resulting … is expected to be small").
- plan-ejecucion.html:327-346: `spark.conf.get` / `SET`, y que la doc no dice qué devuelve con AOS.
- plan-ejecucion.html: citas de maxPartitionBytes, minPartitionNum y unidades MiB; coalesce/repartition(1) (PySpark coalesce: "To avoid this, you can call repartition()…"); modos de `explain()`; isFinalPlan; skipped ("If the data is checkpointed or cached…"); caché en serverless; citas de jobs-timeline, long-spark-stage y one-spark-task.
- stages.html: `spark.task.cpus` = 1; la pestaña Executors incluye el driver ("including the driver"); UDF con `repartition()` (slow-spark-stage-low-io#slow-udfs); "tend to suffer more from scheduling overhead…"; `#high-shuffle` existe y recomienda `auto`.
- shuffle.html: definiciones de métricas (web-ui: Fetch Wait, Remote Reads, spill memory/disk); regla Max frente al percentil 75 al 50 %; archivos intermedios (guía de RDD con su etiqueta).
- joins.html: 10 MB y `-1`, `broadcastTimeout` 300 s, umbral de AQE de 30 MB, FAQ LEFT OUTER, particiones vacías, prioridad de hints, `HintErrorLogger`, lectura local tras convertir (`localShuffleReader`), umbrales que no se pueden fijar en serverless, condiciones de skew (5× y 256 MB, solo SMJ/SHJ), citas de `EXPLODING_JOIN`, `HISTORY_BASED_JOIN_STRATEGY` y `COVERAGE_PHOTON`, "always selects the best join type", y que la doc de Photon no da nombres de nodos de join.
- repaso: R3 y R4 (cuentas de stages y tasks), E3 (coalesce a 1 partición por `minPartitionSize` de 1 MB), E5 (FAQ LEFT OUTER). joins.js sigue las reglas que describe la página, incluidas las que vienen del código y están etiquetadas.

---

### Respuestas a las 8 dudas

1. **`auto` y auto-optimized shuffle.** Son lo mismo: "Setting the value auto enables auto-optimized shuffle" (AQE#enable-auto-optimized-shuffle; la página de streaming sin estado lo llama "Auto Optimized Shuffle (AOS)").
   - Cómo ponerlo, con la sintaxis de https://docs.databricks.com/aws/en/spark/conf#configure-spark-properties-for-notebooks-and-jobs (par Azure en la misma ruta):
     - SQL: `SET spark.sql.shuffle.partitions = auto;`
     - Python: `spark.conf.set("spark.sql.shuffle.partitions", "auto")`
     - En la configuración del compute: `spark.sql.shuffle.partitions auto`
   - En serverless está permitido y ya es el valor por defecto.
   - Valor efectivo: `spark.conf.get(...)` o `SET spark.sql.shuffle.partitions;` dan el valor configurado. La doc no dice cómo leer el número que eligió AOS; se ve en las tasks del stage que lee el shuffle. El manual ya lo dice así.
   - DBR 19: es correcto con matices. Viene de la actualización del 21-sep-2026, los clusters la reciben al reiniciar y la nota dice "v2" (ver veredictos 3 y 4). La página de AQE sigue diciendo "Default value: 200", así que las dos páginas de Databricks no coinciden.
   - shuffle.html:105-107 sí necesita la condición (veredicto 2).
2. **Lectura de tablas pequeñas.** Ver el veredicto 11. Ni Spark ni Databricks documentan la fórmula, así que propongo reescribir sin el dato.
3. **Photon.**
   - Nodos de join: la doc oficial no da sus nombres. Solo dice que Photon "Replaces sort-merge joins with high-performance hash joins", lista los operadores "Hash Aggregate/Join/Shuffle", "Nested-Loop Join" y "Null-Aware Anti Join", y explica que se distinguen por color (naranja en el Spark UI, morado en el query profile). El `PhotonBroadcastHashJoin` que encontró el junior viene de la comunidad y no vale como fuente.
   - Por defecto: activado si el compute se crea desde la UI (checkbox); con la Jobs API hay que fijar `runtime_engine=PHOTON`. El glosario está mal y arquitectura.html está bien (veredicto 5).
   - URL: no se movió (veredicto 16).
4. **Job de Lakeflow frente a job del Spark UI.** No hay ninguna frase oficial que los contraste, pero cada término tiene su definición:
   - Lakeflow: "Job - A job is the primary resource for coordinating, scheduling, and running your operations" y "Task - A task is a specific unit of work within a job" — https://docs.databricks.com/aws/en/jobs/#orchestration-concepts · par Azure: https://learn.microsoft.com/azure/databricks/jobs/#orchestration-concepts
   - Spark: "Job: A parallel computation consisting of multiple tasks that gets spawned in response to a Spark action (e.g. save, collect)" y "Task: A unit of work that will be sent to one executor" — https://spark.apache.org/docs/latest/cluster-overview.html#glossary
   - Puente oficial entre los dos: "For jobs running on classic compute, use the Spark UI to diagnose slow stages and tasks. Start with the event timeline to spot long-running jobs…" — https://docs.databricks.com/aws/en/jobs/diagnose-job-performance#running-phase · par Azure: https://learn.microsoft.com/azure/databricks/jobs/diagnose-job-performance#running-phase
   - Choca también "task": una task de Lakeflow no es una task de Spark. Contenido propuesto en Huecos.
5. **Duda 5.** Ver el veredicto 7.
6. **Duda 6.** Ver el veredicto 15.
7. **Duda 7.** Ver el veredicto 6. La doc de serverless no dice nada de hints. Lo positivo es que `broadcast()` y `hint()` dicen "Supports Spark Connect", y serverless admite las APIs de Spark Connect.
8. **Duda 8.** Ver el veredicto 14. Hay fuente, en la FAQ de AQE.

---

### Huecos
- **Job y task de Lakeflow frente a job y task de Spark** (arquitectura.html, "Con qué se confunde", junto a "Scheduler de Spark vs programar un job"). El lector confunde su job de 40 min con los "Job 0, 1…" del Spark UI. Datos con fuente: las dos definiciones de la duda 4 y la cita de diagnose-job-performance#running-phase. Que una ejecución lance muchos jobs de Spark es una deducción a partir de esas definiciones (uno o más por acción), no una cita. URLs: https://docs.databricks.com/aws/en/jobs/#orchestration-concepts · https://spark.apache.org/docs/latest/cluster-overview.html#glossary
- **Requisito de AQE para `auto`** (owner: remedios.html#auto). Quien apague AQE pierde AOS. La única fuente explícita es la página de streaming sin estado ("To enable AOS …, enable AQE and set …"); para batch no lo encontré documentado, así que mencionarlo solo con ese alcance. https://docs.databricks.com/aws/en/structured-streaming/stateless-streaming
- **`df.checkpoint()` en serverless** (plan-ejecucion.html:537-540). El texto lo presenta como alternativa a la caché, pero en serverless tampoco funciona: "df.checkpoint()" está en la lista de "Dataframe and SQL cache APIs are not supported on serverless compute" — https://docs.databricks.com/aws/en/compute/serverless/limitations#caching-limitations
- **Cambiar particiones al reiniciar un stream sin estado** (owner: aqe.html o remedios). La nota de AQE dice que en streaming la conf no se puede cambiar entre reinicios, pero en streaming sin estado desde DBR 18.0 sí se puede ("Stateless streaming queries support changing the number of shuffle partitions when you restart a query"). Afecta a app.js:750-759 solo si el caso dejara de ser con estado. https://docs.databricks.com/aws/en/structured-streaming/stateless-streaming#change-shuffle-partitions-during-query-restart

### Fuera de mi tema
- src/plan-ejecucion.html:520-525 "Con menos de 1 TB, Databricks recomienda no particionar" — experto-delta
- src/repaso-fundamentos.html:780-789 optimized writes "activado … al crear o insertar en tablas particionadas de Unity Catalog" (DBR 13.3 LTS+) — experto-delta
- src/joins.html:599-600 y 651-655 `ANALYZE TABLE` / predictive optimization en tablas managed de UC — experto-delta
- src/shuffle.html:380-390 y 426-428 columnas `shuffle_read_bytes` y `spilled_local_bytes` de `system.query.history`, y "por defecto solo los admins" — experto-observabilidad
- src/joins.html:487-489 operador "Join" y métricas Rows / Memory peak del query profile — experto-observabilidad
- src/repaso-fundamentos.html:633-634 y 793-794 "abrir el Spark UI de una ejecución terminada" (el junior citó "The Spark UI continues to be available after the run has completed", de la API de Jobs) — experto-observabilidad
- src/arquitectura.html:254-265 compute estándar con Spark UI y modo de acceso (en Python con DBR 14.3+, según connect-vs-classic) — experto-plataforma